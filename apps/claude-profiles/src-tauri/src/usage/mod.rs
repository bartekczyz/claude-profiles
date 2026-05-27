pub(crate) mod credentials;
pub(crate) mod quota;
pub(crate) mod refresh;

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileUsage {
    pub quota: Option<QuotaUsage>,
    pub quota_error: Option<QuotaError>,
    pub fetched_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuotaUsage {
    pub five_hour: Option<Window>,
    pub seven_day: Option<Window>,
    pub seven_day_sonnet: Option<Window>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Window {
    pub utilization: Option<f32>,
    pub resets_at: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum QuotaError {
    NoCredentials,
    Unauthorized,
    RateLimited,
    Network,
    Unknown,
}

use std::path::Path;

use chrono::Utc;

/// Fetches the profile's quota and wraps it in a `ProfileUsage`.
pub async fn build(cli_config_dir: &Path, client: &dyn quota::UsageClient) -> ProfileUsage {
    let (quota, quota_error) = match quota::fetch_quota(cli_config_dir, client).await {
        Ok(value) => (Some(value), None),
        Err(error) => (None, Some(error)),
    };
    ProfileUsage {
        quota,
        quota_error,
        fetched_at: Utc::now().to_rfc3339(),
    }
}

/// Same as `build`, but on a `QuotaError::Unauthorized` first response we
/// ask the `refresher` to trigger Claude Code's own OAuth refresh and
/// then retry the quota fetch once. If the retry also fails the result
/// surfaces the second error to the user, who then sees the same
/// "Token refresh needed" message as before — so this strictly improves
/// the success path without regressing the failure path.
pub async fn build_with_cli_refresh(
    cli_config_dir: &Path,
    client: &dyn quota::UsageClient,
    refresher: &dyn refresh::CliRefresher,
) -> ProfileUsage {
    let first = build(cli_config_dir, client).await;
    if !matches!(first.quota_error, Some(QuotaError::Unauthorized)) {
        return first;
    }
    refresher.try_refresh(cli_config_dir).await;
    let retry = quota::fetch_quota(cli_config_dir, client).await;
    let (quota, quota_error) = match retry {
        Ok(value) => (Some(value), None),
        Err(error) => (None, Some(error)),
    };
    ProfileUsage {
        quota,
        quota_error,
        fetched_at: Utc::now().to_rfc3339(),
    }
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::Path;
    use std::sync::Mutex;

    use async_trait::async_trait;
    use tempfile::TempDir;

    use super::quota::{HttpResponse, UsageClient};
    use super::refresh::CliRefresher;
    use super::*;

    struct AlwaysFailsClient;

    #[async_trait]
    impl UsageClient for AlwaysFailsClient {
        async fn fetch(&self, _: &str) -> Result<HttpResponse, QuotaError> {
            Err(QuotaError::Network)
        }
    }

    /// Returns a queued list of responses in order. Once the queue is
    /// empty, every subsequent call returns Network. Each call records
    /// the access token it was handed.
    struct QueuedClient {
        responses: Mutex<Vec<Result<HttpResponse, QuotaError>>>,
        calls: Mutex<u32>,
    }

    impl QueuedClient {
        fn new(responses: Vec<Result<HttpResponse, QuotaError>>) -> Self {
            Self {
                responses: Mutex::new(responses),
                calls: Mutex::new(0),
            }
        }
    }

    #[async_trait]
    impl UsageClient for QueuedClient {
        async fn fetch(&self, _: &str) -> Result<HttpResponse, QuotaError> {
            *self.calls.lock().unwrap() += 1;
            self.responses
                .lock()
                .unwrap()
                .pop()
                .unwrap_or(Err(QuotaError::Network))
        }
    }

    struct RecordingRefresher {
        calls: Mutex<u32>,
    }

    impl RecordingRefresher {
        fn new() -> Self {
            Self {
                calls: Mutex::new(0),
            }
        }
    }

    #[async_trait]
    impl CliRefresher for RecordingRefresher {
        async fn try_refresh(&self, _: &Path) {
            *self.calls.lock().unwrap() += 1;
        }
    }

    fn dir_with_token() -> TempDir {
        let dir = TempDir::new().unwrap();
        fs::write(
            dir.path().join(".credentials.json"),
            r#"{"claudeAiOauth":{"accessToken":"sk-test"}}"#,
        )
        .unwrap();
        dir
    }

    fn body_with_one_window() -> Vec<u8> {
        br#"{"five_hour":{"utilization":50.0,"resets_at":null}}"#.to_vec()
    }

    #[tokio::test]
    async fn quota_network_failure_surfaces_network_error() {
        let dir = TempDir::new().unwrap();
        fs::write(
            dir.path().join(".credentials.json"),
            r#"{"claudeAiOauth":{"accessToken":"sk"}}"#,
        )
        .unwrap();
        let result = build(dir.path(), &AlwaysFailsClient).await;
        assert!(result.quota.is_none());
        assert!(matches!(result.quota_error, Some(QuotaError::Network)));
    }

    #[tokio::test]
    async fn missing_credentials_returns_nocredentials() {
        let dir = TempDir::new().unwrap();
        let client = AlwaysFailsClient;
        let result = build(dir.path(), &client).await;
        assert!(matches!(
            result.quota_error,
            Some(QuotaError::NoCredentials)
        ));
    }

    // --- build_with_cli_refresh orchestration ---

    #[tokio::test]
    async fn refresh_is_not_triggered_when_first_fetch_succeeds() {
        let dir = dir_with_token();
        let client = QueuedClient::new(vec![Ok(HttpResponse {
            status: 200,
            body: body_with_one_window(),
        })]);
        let refresher = RecordingRefresher::new();
        let result = build_with_cli_refresh(dir.path(), &client, &refresher).await;
        assert!(result.quota.is_some());
        assert!(result.quota_error.is_none());
        assert_eq!(*refresher.calls.lock().unwrap(), 0);
        assert_eq!(*client.calls.lock().unwrap(), 1);
    }

    #[tokio::test]
    async fn refresh_is_not_triggered_for_non_unauthorized_errors() {
        // Network errors should NOT trigger a refresh — only Unauthorized
        // is plausibly recoverable by re-running `claude`.
        let dir = dir_with_token();
        let client = QueuedClient::new(vec![Err(QuotaError::Network)]);
        let refresher = RecordingRefresher::new();
        let result = build_with_cli_refresh(dir.path(), &client, &refresher).await;
        assert!(matches!(result.quota_error, Some(QuotaError::Network)));
        assert_eq!(*refresher.calls.lock().unwrap(), 0);
    }

    #[tokio::test]
    async fn refresh_recovers_on_unauthorized_then_success() {
        let dir = dir_with_token();
        // QueuedClient::pop returns from the end, so order responses in
        // reverse: first call returns Unauthorized, second returns 200.
        let client = QueuedClient::new(vec![
            Ok(HttpResponse {
                status: 200,
                body: body_with_one_window(),
            }),
            Err(QuotaError::Unauthorized),
        ]);
        let refresher = RecordingRefresher::new();
        let result = build_with_cli_refresh(dir.path(), &client, &refresher).await;
        assert!(result.quota.is_some(), "expected recovered quota");
        assert!(result.quota_error.is_none());
        assert_eq!(*refresher.calls.lock().unwrap(), 1);
        assert_eq!(*client.calls.lock().unwrap(), 2);
    }

    #[tokio::test]
    async fn refresh_only_runs_once_and_surfaces_second_unauthorized() {
        let dir = dir_with_token();
        let client = QueuedClient::new(vec![
            Err(QuotaError::Unauthorized),
            Err(QuotaError::Unauthorized),
        ]);
        let refresher = RecordingRefresher::new();
        let result = build_with_cli_refresh(dir.path(), &client, &refresher).await;
        assert!(matches!(result.quota_error, Some(QuotaError::Unauthorized)));
        assert!(result.quota.is_none());
        assert_eq!(*refresher.calls.lock().unwrap(), 1);
        assert_eq!(*client.calls.lock().unwrap(), 2);
    }
}
