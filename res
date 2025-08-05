
> arbeidsplassen-playwright@1.0.0 test
> playwright test --project chromium

[0K
Running 1 test using 1 worker

     1 [chromium] › tests/example.spec.js:5:1 › Verify Google loads
  pw:api => browserType.launch started +0ms
  pw:browser <launching> /app/playwright-install/chromium_headless_shell-1181/chrome-linux/headless_shell --disable-field-trial-config --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-back-forward-cache --disable-breakpad --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-component-update --no-default-browser-check --disable-default-apps --disable-dev-shm-usage --disable-extensions --disable-features=AcceptCHFrame,AutoExpandDetailsElement,AvoidUnnecessaryBeforeUnloadCheckSync,CertificateTransparencyComponentUpdater,DestroyProfileOnBrowserClose,DialMediaRouteProvider,ExtensionManifestV2Disabled,GlobalMediaControls,HttpsUpgrades,ImprovedCookieControls,LazyFrameLoading,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,Translate,AutoDeElevate --allow-pre-commit-input --disable-hang-monitor --disable-ipc-flooding-protection --disable-popup-blocking --disable-prompt-on-repost --disable-renderer-backgrounding --force-color-profile=srgb --metrics-recording-only --no-first-run --password-store=basic --use-mock-keychain --no-service-autorun --export-tagged-pdf --disable-search-engine-choice-screen --unsafely-disable-devtools-self-xss-warnings --edge-skip-compat-layer-relaunch --enable-automation --headless --hide-scrollbars --mute-audio --blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4 --no-sandbox --user-data-dir=/tmp/playwright_chromiumdev_profile-54KMX3 --remote-debugging-pipe --no-startup-window +0ms
  pw:browser <launched> pid=43 +2ms
  pw:browser [pid=43][err] [0805/095154.539226:ERROR:dbus/bus.cc:408] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory +35ms
  pw:browser [pid=43][err] [0805/095154.539600:ERROR:dbus/bus.cc:408] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory +0ms
  pw:browser [pid=43][err] [0805/095154.539654:ERROR:dbus/bus.cc:408] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory +0ms
  pw:browser [pid=43][err] [0805/095154.553044:WARNING:sandbox/policy/linux/sandbox_linux.cc:415] InitializeSandbox() called with multiple threads in process gpu-process. +13ms
  pw:browser [pid=43][err] [0805/095154.572070:WARNING:device/bluetooth/dbus/bluez_dbus_manager.cc:234] Floss manager service not available, cannot set Floss enable/disable. +19ms
  pw:api <= browserType.launch succeeded +75ms
  pw:api => browser.newContext started +2ms
  pw:api <= browser.newContext succeeded +3ms
  pw:api => browserContext.newPage started +1ms
  pw:api <= browserContext.newPage succeeded +14ms
  pw:api => page.goto started +1ms
  pw:api navigating to "https://google.com/", waiting until "load" +1ms
  pw:api   "commit" event fired +260ms
  pw:api   navigated to "https://www.google.com/" +1ms
  pw:api   navigated to "https://www.google.com/" +149ms
  pw:api   "domcontentloaded" event fired +0ms
  pw:api   "load" event fired +123ms
  pw:api <= page.goto succeeded +0ms
  pw:api => expect.toHaveTitle started +4ms
  pw:api Expect "toHaveTitle" with timeout 5000ms +1ms
  pw:api <= expect.toHaveTitle succeeded +14ms
  pw:api taking page screenshot +5ms
  pw:api waiting for fonts to load... +2ms
  pw:api fonts loaded +0ms
  ✓  1 [chromium] › tests/example.spec.js:5:1 › Verify Google loads (635ms)
  pw:browser [pid=43] <gracefully close start> +643ms
  pw:browser [pid=43] <process did exit: exitCode=0, signal=null> +8ms
  pw:browser [pid=43] starting temporary directories cleanup +1ms
  pw:browser [pid=43] finished temporary directories cleanup +1ms
  pw:browser [pid=43] <gracefully close end> +0ms

  1 passed (1.1s)

To open last HTML report run:

  npx playwright show-report

[0K\[0K