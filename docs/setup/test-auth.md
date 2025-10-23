# Authentication Testing

This file contains curl commands to test the authentication endpoints.

## 1. Test Login (Admin User)

```powershell
$body = @{
    email = "admin@easytix.com"
    password = "Admin123!"
} | ConvertTo-Json

Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/auth/login" -Body $body -ContentType "application/json"
```

## 2. Test Login (Organizer User)

```powershell
$body = @{
    email = "organizer@example.com"
    password = "Organizer123!"
} | ConvertTo-Json

Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/auth/login" -Body $body -ContentType "application/json"
```

## 3. Test Login (Customer User)

```powershell
$body = @{
    email = "customer@example.com"
    password = "Customer123!"
} | ConvertTo-Json

Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/auth/login" -Body $body -ContentType "application/json"
```

## 4. Test Registration (New Customer)

```powershell
$body = @{
    email = "newuser@example.com"
    password = "NewUser123!"
    firstName = "John"
    lastName = "Doe"
    phone = "+1234567890"
    role = "CUSTOMER"
} | ConvertTo-Json

Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/auth/register" -Body $body -ContentType "application/json"
```

## 5. Test Get Current User

```powershell
# First, save the token from login response
$loginResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/auth/login" -Body (@{email="admin@easytix.com"; password="Admin123!"} | ConvertTo-Json) -ContentType "application/json"
$token = $loginResponse.data.token

# Then use the token to get current user
$headers = @{
    Authorization = "Bearer $token"
}

Invoke-RestMethod -Method GET -Uri "http://localhost:3000/api/auth/me" -Headers $headers
```

## 6. Test Logout

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/auth/logout"
```