$ErrorActionPreference = "Stop"

$outDir = Join-Path $PSScriptRoot "..\public\downloads"
$zipPath = Join-Path $outDir "cityrun-package.zip"
$apkPath = Join-Path $outDir "cityrun.apk"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$payload = @{
  additionalTrustedOrigins = @()
  appVersion = "1.0.0.0"
  appVersionCode = 1
  backgroundColor = "#070D1A"
  display = "standalone"
  enableNotifications = $true
  enableSiteSettingsShortcut = $true
  fallbackType = "customtabs"
  features = @{
    locationDelegation = @{ enabled = $true }
    playBilling = @{ enabled = $false }
  }
  host = "https://www.citygateshl.org"
  iconUrl = "https://www.citygateshl.org/icon-512.png"
  includeSourceCode = $false
  isChromeOSOnly = $false
  launcherName = "City Run"
  maskableIconUrl = "https://www.citygateshl.org/icon-512.png"
  monochromeIconUrl = "https://www.citygateshl.org/icon-512.png"
  name = "City Run"
  navigationColor = "#070D1A"
  navigationColorDark = "#070D1A"
  navigationDividerColor = "#070D1A"
  navigationDividerColorDark = "#070D1A"
  orientation = "portrait"
  packageId = "org.citygateshl.cityrun"
  serviceAccountJsonFile = $null
  shareTarget = $null
  shortcuts = @()
  signing = $null
  signingMode = "none"
  splashScreenFadeOutDuration = 300
  startUrl = "/cityrun"
  themeColor = "#3478F6"
  themeColorDark = "#070D1A"
  webManifestUrl = "https://www.citygateshl.org/manifest.json"
} | ConvertTo-Json -Depth 10 -Compress

Write-Host "Requesting APK from PWABuilder..."
Invoke-WebRequest `
  -Uri "https://pwabuilder-cloudapk.azurewebsites.net/generateAppPackage" `
  -Method POST `
  -Body $payload `
  -ContentType "application/json" `
  -OutFile $zipPath `
  -TimeoutSec 600

Write-Host "Extracting APK..."
Expand-Archive -Path $zipPath -DestinationPath (Join-Path $outDir "cityrun-package") -Force
$apkFile = Get-ChildItem -Path (Join-Path $outDir "cityrun-package") -Filter "*.apk" -Recurse | Select-Object -First 1
if (-not $apkFile) {
  throw "No APK found in generated package."
}

Copy-Item -Path $apkFile.FullName -Destination $apkPath -Force
Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $outDir "cityrun-package") -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Saved $apkPath ($((Get-Item $apkPath).Length) bytes)"
