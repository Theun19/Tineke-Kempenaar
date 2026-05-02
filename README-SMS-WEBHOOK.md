## SMS webhook setup (Twilio)

Gebruik deze stappen zodat de 2FA op `manage.html` echt via sms werkt.

### 1. Vul Twilio gegevens in je terminal

```bash
export TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export TWILIO_AUTH_TOKEN="your_auth_token"
export TWILIO_FROM_NUMBER="+31xxxxxxxxx"
```

### 2. Start de gecombineerde site + webhook server

```bash
cd "/Users/theunvangiffen/tinek 3"
python3 dev_server.py --host 127.0.0.1 --port 8080 --root .
```

Open daarna:

`http://127.0.0.1:8080/manage.html`

### 3. Zet in Beveiliging

- `Telefoonnummer (sms)`: bijvoorbeeld `+31627838003`
- `SMS webhook`: `http://127.0.0.1:8080/api/send-sms`

Klik op **Beveiliging opslaan**.

### 4. Test login

1. Wachtwoord invoeren
2. 4-cijferige code komt via sms
3. Code invoeren = toegang

### 5. Snelle webhook test (optioneel)

```bash
curl -X POST "http://127.0.0.1:8080/api/send-sms" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+31627838003","message":"Webhook test","otp":"1234"}'
```

Bij succes krijg je JSON met `"ok": true`.
