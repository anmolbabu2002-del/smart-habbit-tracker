Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('C:\Users\anmol\.gemini\antigravity\brain\0e63858b-cd74-46d1-b23f-136b8f4a2ae7\ultradian_icon_1774163697692.png')
$bmp = New-Object System.Drawing.Bitmap 512, 512
$bmp.SetResolution($img.HorizontalResolution, $img.VerticalResolution)
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.DrawImage($img, 0, 0, 512, 512)
$bmp.Save('.\icon_512.png', [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bmp.Dispose()
$img.Dispose()
Write-Output "Resized successfully!"
