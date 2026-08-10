// Cấu hình dùng chung cho toàn bộ frontend.
// Tự động nhận diện localhost hoặc devtunnels URL linh hoạt.

(function() {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  let apiBaseUrl = 'http://localhost:4000/api/v1';

  if (hostname.includes('.devtunnels.ms')) {
    // Tự động chuyển port trên devtunnels sang port 4000 (backend)
    const backendHost = hostname.replace(/-\d+\.asse\./, '-4000.asse.').replace(/-\d+\./, '-4000.');
    apiBaseUrl = `${protocol}//${backendHost}/api/v1`;
  } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
    apiBaseUrl = 'http://localhost:4000/api/v1';
  } else if (hostname) {
    apiBaseUrl = `${protocol}//${hostname}:4000/api/v1`;
  }

  window.APP_CONFIG = {
    API_BASE_URL: apiBaseUrl,
  };
})();
