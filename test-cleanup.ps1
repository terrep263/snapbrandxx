# Test script for cleanup endpoint
$cronSecret = "cf0879bf429c02804466ebd56644c3b040895280dffc2c6052e389223d7429bf"
$uri = "http://localhost:3000/api/cron/cleanup"

Write-Host "Testing cleanup endpoint..."
Write-Host "URL: $uri"
Write-Host "Authorization: Bearer $($cronSecret.Substring(0, 20))..."
Write-Host ""

try {
    $headers = @{
        "Authorization" = "Bearer $cronSecret"
    }
    
    $response = Invoke-RestMethod -Uri $uri -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "ERROR:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body:" -ForegroundColor Red
        $responseBody
    }
}

