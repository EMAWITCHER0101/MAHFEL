import UIKit
import WebKit
import UserNotifications

class WebViewController: UIViewController, WKNavigationDelegate, WKScriptMessageHandler {

    static weak var shared: WebViewController?
    private var webView: WKWebView!
    private let appUrl = URL(string: "https://app.soha-sima.ir")!
    private var pendingLink: String = ""
    private var pendingFcmToken: String = ""

    override func viewDidLoad() {
        super.viewDidLoad()
        WebViewController.shared = self

        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        if #available(iOS 14.0, *) {
            config.defaultWebpagePreferences.allowsContentJavaScript = true
        }

        // بریج نیتیو ← وب (همان AndroidBridge در اندروید)
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
        let bridgeJS = """
        window.MahfelIosBridge = {
          isApp: function() { return true; },
          isIos: function() { return true; },
          getAppVersion: function() { return '\(version)'; },
          getFcmToken: function() { return window.__mahfelFcmToken || ''; },
          showNotification: function(title, body, link) {
            window.webkit.messageHandlers.mahfelBridge.postMessage({ action: 'showNotification', title: String(title || ''), body: String(body || ''), link: String(link || '') });
          },
          downloadAndInstallApk: function() { return false; },
          startOtpAutofill: function() { return false; }
        };
        """
        let script = WKUserScript(source: bridgeJS, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        config.userContentController.addUserScript(script)
        config.userContentController.add(self, name: "mahfelBridge")

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.isOpaque = false
        webView.backgroundColor = .white
        webView.scrollView.bounces = false
        view = webView

        webView.load(URLRequest(url: appUrl))
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        UIApplication.shared.applicationIconBadgeNumber = 0
    }

    // MARK: - توکن FCM ← وب

    func setFcmToken(_ token: String) {
        pendingFcmToken = token
        injectFcmToken(token)
    }

    private func injectFcmToken(_ token: String) {
        let escaped = token.replacingOccurrences(of: "'", with: "\\'")
        webView?.evaluateJavaScript("""
        window.__mahfelFcmToken = '\(escaped)';
        try { window.dispatchEvent(new Event('mahfel-fcm-token')); } catch (e) {}
        """, completionHandler: nil)
    }

    // MARK: - باز کردن لینک نوتیفیکیشن

    func openLink(_ link: String) {
        guard !link.isEmpty else { return }
        let escaped = link.replacingOccurrences(of: "'", with: "\\'")
        webView?.evaluateJavaScript("""
        try { window.dispatchEvent(new CustomEvent('mahfel-open-notif', { detail: '\(escaped)' })); } catch (e) {}
        """, completionHandler: nil)
    }

    // MARK: - WKScriptMessageHandler (وب → نیتیو)

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard message.name == "mahfelBridge",
              let body = message.body as? [String: Any],
              let action = body["action"] as? String else { return }

        switch action {
        case "showNotification":
            let title = (body["title"] as? String) ?? "محفل"
            let notifBody = (body["body"] as? String) ?? ""
            let link = (body["link"] as? String) ?? ""
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = notifBody
            content.sound = .default
            if !link.isEmpty {
                content.userInfo = ["url": link]
            }
            let request = UNNotificationRequest(identifier: UUID().uuidString,
                                                content: content,
                                                trigger: nil)
            UNUserNotificationCenter.current().add(request)
        default:
            break
        }
    }

    // MARK: - WKNavigationDelegate

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if !pendingLink.isEmpty {
            let link = pendingLink
            pendingLink = ""
            openLink(link)
        }
        if !pendingFcmToken.isEmpty {
            injectFcmToken(pendingFcmToken)
        }
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        // در صورت قطع اینترنت، صفحه آفلاین محلی را نشان بده
        let nsError = error as NSError
        if let url = nsError.userInfo[NSURLErrorFailingURLErrorKey] as? URL,
           url.host == appUrl.host,
           let offlinePath = Bundle.main.path(forResource: "offline", ofType: "html") {
            webView.loadFileURL(URL(fileURLWithPath: offlinePath), allowingReadAccessTo: URL(fileURLWithPath: offlinePath).deletingLastPathComponent())
        }
    }
}