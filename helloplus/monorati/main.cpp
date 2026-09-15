#include <ctime>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <winsock2.h>
#include <ws2tcpip.h>

#pragma comment(lib, "Ws2_32.lib")

std::string buildTimeJson() {
    const std::time_t now = std::time(nullptr);
    std::tm localTime{};
    localtime_s(&localTime, &now);

    std::ostringstream timeStream;
    timeStream << std::put_time(&localTime, "%H:%M:%S");

    std::ostringstream dateStream;
    dateStream << std::put_time(&localTime, "%A, %B %d, %Y");

    return "{\"time\":\"" + timeStream.str() + "\",\"date\":\"" +
           dateStream.str() + "\",\"timezone\":\"Local time\"}";
}

std::string buildHtml() {
    return R"HTML(
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Time Dashboard</title>
  <style>
    :root {
      --bg: #f4efe7;
      --panel: #fbf7f1;
      --primary: #1f2937;
      --accent: #4f46e5;
      --muted: #6b7280;
      --success: #16a34a;
      --shadow: rgba(15, 23, 42, 0.12);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: var(--bg);
      color: var(--primary);
      font-family: Arial, Helvetica, sans-serif;
    }
    .dashboard {
      width: min(560px, 90vw);
      background: var(--panel);
      border-radius: 22px;
      box-shadow: 0 20px 45px var(--shadow);
      padding: 32px 28px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .eyebrow {
      margin: 0 0 6px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 11px;
      color: var(--muted);
    }
    h1 {
      margin: 0;
      font-size: clamp(2rem, 4vw, 2.7rem);
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(22, 163, 74, 0.08);
      color: var(--success);
      border-radius: 999px;
      padding: 8px 12px;
      font-weight: 600;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: currentColor;
      display: inline-block;
    }
    .clock-box {
      background: linear-gradient(180deg, #f3f2ff, #f8f7ff);
      border: 1px solid rgba(79, 70, 229, 0.12);
      border-radius: 18px;
      padding: 24px 18px;
      text-align: center;
    }
    .label {
      margin: 0 0 10px;
      color: var(--muted);
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.08em;
    }
    .time {
      margin: 0;
      font-size: clamp(2.6rem, 9vw, 5rem);
      font-weight: 700;
      letter-spacing: 0.06em;
    }
    .date {
      margin: 12px 0 0;
      font-size: 1.2rem;
      color: var(--primary);
    }
    .timezone {
      margin: 10px 0 0;
      color: var(--muted);
      font-size: 0.94rem;
    }
    .footer {
      margin-top: 22px;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      color: var(--muted);
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <main class="dashboard">
    <header class="header">
      <div>
        <p class="eyebrow">Personal dashboard</p>
        <h1>Today, in focus.</h1>
      </div>
      <div class="status"><span class="dot"></span><span id="status">Loading...</span></div>
    </header>

    <section class="clock-box">
      <p class="label">Local time</p>
      <p class="time" id="time">--:--:--</p>
      <p class="date" id="date">Waiting for data</p>
      <p class="timezone" id="timezone">--</p>
    </section>

    <footer class="footer">
      <span>Updated every second</span>
      <span>Single-file C++ app</span>
    </footer>
  </main>

  <script>
    async function updateClock() {
      try {
        const response = await fetch('/api/time', { cache: 'no-store' });
        if (!response.ok) throw new Error('Request failed');
        const data = await response.json();
        document.getElementById('time').textContent = data.time;
        document.getElementById('date').textContent = data.date;
        document.getElementById('timezone').textContent = data.timezone;
        document.getElementById('status').textContent = 'Live';
      } catch (error) {
        document.getElementById('status').textContent = 'Offline';
      }
    }

    updateClock();
    setInterval(updateClock, 1000);
  </script>
</body>
</html>
)HTML";
}

std::string parseRequestPath(const std::string& request) {
    const std::string method = "GET ";
    const std::string httpVersion = " HTTP/1.1";
    const std::size_t start = request.find(method);
    if (start == std::string::npos) {
        return "/";
    }

    const std::size_t pathStart = start + method.size();
    const std::size_t pathEnd = request.find(httpVersion, pathStart);
    if (pathEnd == std::string::npos) {
        return "/";
    }

    return request.substr(pathStart, pathEnd - pathStart);
}

std::string buildHttpResponse(const std::string& path) {
    std::string body;
    std::string contentType = "text/html; charset=utf-8";
    int statusCode = 200;

    if (path == "/api/time") {
        body = buildTimeJson();
        contentType = "application/json; charset=utf-8";
    } else if (path == "/" || path == "/index.html") {
        body = buildHtml();
    } else {
        statusCode = 404;
        body = "<h1>Not found</h1>";
    }

    std::ostringstream response;
    response << "HTTP/1.1 " << statusCode << " "
             << (statusCode == 200 ? "OK" : "Not Found") << "\r\n"
             << "Content-Type: " << contentType << "\r\n"
             << "Content-Length: " << body.size() << "\r\n"
             << "Connection: close\r\n\r\n"
             << body;
    return response.str();
}

int main() {
    WSADATA winsockData{};
    if (WSAStartup(MAKEWORD(2, 2), &winsockData) != 0) {
        std::cerr << "Failed to initialize Winsock\n";
        return 1;
    }

    SOCKET serverSocket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (serverSocket == INVALID_SOCKET) {
        std::cerr << "Failed to create socket\n";
        WSACleanup();
        return 1;
    }

    sockaddr_in serverAddress{};
    serverAddress.sin_family = AF_INET;
    serverAddress.sin_addr.s_addr = htonl(INADDR_ANY);
    serverAddress.sin_port = htons(8080);

    if (bind(serverSocket, reinterpret_cast<sockaddr*>(&serverAddress), sizeof(serverAddress)) == SOCKET_ERROR ||
        listen(serverSocket, SOMAXCONN) == SOCKET_ERROR) {
        std::cerr << "Failed to bind or listen on port 8080\n";
        closesocket(serverSocket);
        WSACleanup();
        return 1;
    }

    std::cout << "Single-file C++ dashboard running at http://localhost:8080\n";
    std::cout << "API endpoint: http://localhost:8080/api/time\n";

    while (true) {
        SOCKET clientSocket = accept(serverSocket, nullptr, nullptr);
        if (clientSocket == INVALID_SOCKET) {
            continue;
        }

        char request[4096]{};
        const int bytesRead = recv(clientSocket, request, sizeof(request) - 1, 0);
        if (bytesRead > 0) {
            std::string requestText(request, bytesRead);
            const std::string path = parseRequestPath(requestText);
            const std::string response = buildHttpResponse(path);
            send(clientSocket, response.c_str(), static_cast<int>(response.size()), 0);
        }

        closesocket(clientSocket);
    }

    closesocket(serverSocket);
    WSACleanup();
    return 0;
}