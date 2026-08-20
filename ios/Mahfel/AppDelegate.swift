import UIKit
import UserNotifications
import FirebaseCore
import FirebaseMessaging
import AVFoundation

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Firebase — فقط اگر GoogleService-Info.plist واقعی (غیر از placeholder) موجود باشد
        if let plistPath = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
           let plistData = FileManager.default.contents(atPath: plistPath),
           let plist = try? PropertyListSerialization.propertyList(from: plistData, format: nil) as? [String: Any],
           let appId = plist["GOOGLE_APP_ID"] as? String,
           !appId.contains("PLACEHOLDER") {
            FirebaseApp.configure()
        }

        // پخش صدا در پسزمینه
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [])
        try? AVAudioSession.sharedInstance().setActive(true)

        // نوتیفیکیشن
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
            DispatchQueue.main.async {
                if granted {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
        }
        if #available(iOS 10.0, *) {
            Messaging.messaging().delegate = self
        }
        return true
    }

    // MARK: - APNs / FCM

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("APNs registration failed: \(error.localizedDescription)")
    }

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        print("FCM token: \(token)")
        WebViewController.shared?.setFcmToken(token)
    }

    // MARK: - UNUserNotificationCenterDelegate

    // اپ جلو است → نمایش بومی را سرکوب کن (بنر داخل اپ از طریق WebSocket میآید)
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([])
    }

    // کلیک روی نوتیفیکیشن → لینک را به وب داخل اپ بفرست
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        let link = (userInfo["url"] as? String) ?? ""
        WebViewController.shared?.openLink(link)
        completionHandler()
    }

    // MARK: - Scene

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default", sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}