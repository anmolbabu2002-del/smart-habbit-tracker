Add-Type -AssemblyName System.Drawing

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$srcPath = Join-Path $dir "ultradian_pure_app_icon_1774121941124.png"

$src = [System.Drawing.Image]::FromFile($srcPath)

# Create 192x192
$bmp192 = New-Object System.Drawing.Bitmap 192, 192
$g1 = [System.Drawing.Graphics]::FromImage($bmp192)
$g1.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g1.DrawImage($src, 0, 0, 192, 192)
$g1.Dispose()
$bmp192.Save((Join-Path $dir "icon-192.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp192.Dispose()

# Create 512x512
$bmp512 = New-Object System.Drawing.Bitmap 512, 512
$g2 = [System.Drawing.Graphics]::FromImage($bmp512)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.DrawImage($src, 0, 0, 512, 512)
$g2.Dispose()
$bmp512.Save((Join-Path $dir "icon-512.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp512.Dispose()

$src.Dispose()

Write-Host "Done! icon-192.png and icon-512.png created."
