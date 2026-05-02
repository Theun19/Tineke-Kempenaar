#!/usr/bin/env python3
"""Local server for static site + SMS webhook endpoint.

Run:
  TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM_NUMBER=+31... python3 dev_server.py
"""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import pathlib
import urllib.error
import urllib.parse
import urllib.request
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


def twilio_send_sms(to_number: str, message: str) -> tuple[bool, str]:
  account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
  auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
  from_number = os.getenv("TWILIO_FROM_NUMBER", "").strip()

  if not account_sid or not auth_token or not from_number:
    return False, "Missing Twilio credentials in environment variables."

  url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
  body = urllib.parse.urlencode({
    "To": to_number,
    "From": from_number,
    "Body": message,
  }).encode("utf-8")

  request = urllib.request.Request(url, data=body, method="POST")
  credentials = f"{account_sid}:{auth_token}".encode("utf-8")
  auth_header = base64.b64encode(credentials).decode("ascii")
  request.add_header("Authorization", f"Basic {auth_header}")
  request.add_header("Content-Type", "application/x-www-form-urlencoded")

  try:
    with urllib.request.urlopen(request, timeout=12) as response:
      if 200 <= response.status < 300:
        return True, ""
      return False, f"Twilio returned status {response.status}"
  except urllib.error.HTTPError as exc:
    detail = ""
    try:
      detail = exc.read().decode("utf-8", errors="replace")
    except Exception:
      detail = str(exc)
    return False, f"Twilio HTTP error {exc.code}: {detail}"
  except Exception as exc:  # noqa: BLE001
    return False, f"Network error: {exc}"


class SiteHandler(BaseHTTPRequestHandler):
  server_version = "TinekeDevServer/1.0"

  def do_OPTIONS(self) -> None:  # noqa: N802
    self.send_response(HTTPStatus.NO_CONTENT)
    self.send_header("Access-Control-Allow-Origin", "*")
    self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
    self.send_header("Access-Control-Allow-Headers", "Content-Type")
    self.end_headers()

  def do_POST(self) -> None:  # noqa: N802
    if self.path != "/api/send-sms":
      self._json({"ok": False, "error": "Not found"}, HTTPStatus.NOT_FOUND)
      return

    content_length = int(self.headers.get("Content-Length", "0") or "0")
    raw = self.rfile.read(content_length)

    try:
      payload = json.loads(raw.decode("utf-8"))
    except Exception:  # noqa: BLE001
      self._json({"ok": False, "error": "Invalid JSON"}, HTTPStatus.BAD_REQUEST)
      return

    phone = str(payload.get("phone", "")).strip()
    message = str(payload.get("message", "")).strip()

    if not phone or not message:
      self._json({"ok": False, "error": "phone and message are required"}, HTTPStatus.BAD_REQUEST)
      return

    ok, error = twilio_send_sms(phone, message)
    if not ok:
      self._json({"ok": False, "error": error}, HTTPStatus.BAD_GATEWAY)
      return

    self._json({"ok": True}, HTTPStatus.OK)

  def do_GET(self) -> None:  # noqa: N802
    root: pathlib.Path = self.server.root_dir  # type: ignore[attr-defined]

    request_path = self.path.split("?", 1)[0]
    if request_path == "/":
      request_path = "/index.html"

    relative = request_path.lstrip("/")
    target = (root / relative).resolve()

    if not str(target).startswith(str(root.resolve())):
      self.send_error(HTTPStatus.FORBIDDEN, "Forbidden")
      return

    if not target.exists() or not target.is_file():
      self.send_error(HTTPStatus.NOT_FOUND, "File not found")
      return

    content_type, _ = mimetypes.guess_type(str(target))
    if not content_type:
      content_type = "application/octet-stream"

    try:
      data = target.read_bytes()
    except OSError:
      self.send_error(HTTPStatus.INTERNAL_SERVER_ERROR, "Failed to read file")
      return

    self.send_response(HTTPStatus.OK)
    self.send_header("Content-Type", content_type)
    self.send_header("Content-Length", str(len(data)))
    self.end_headers()
    self.wfile.write(data)

  def log_message(self, format: str, *args: object) -> None:  # noqa: A003
    print(f"[{self.log_date_time_string()}] {self.client_address[0]} {format % args}")

  def _json(self, payload: dict[str, object], status: HTTPStatus) -> None:
    data = json.dumps(payload).encode("utf-8")
    self.send_response(status)
    self.send_header("Content-Type", "application/json; charset=utf-8")
    self.send_header("Content-Length", str(len(data)))
    self.send_header("Access-Control-Allow-Origin", "*")
    self.end_headers()
    self.wfile.write(data)


def main() -> None:
  parser = argparse.ArgumentParser(description="Serve site + SMS webhook")
  parser.add_argument("--host", default="127.0.0.1", help="Host to bind")
  parser.add_argument("--port", type=int, default=8080, help="Port to bind")
  parser.add_argument("--root", default=".", help="Site root directory")
  args = parser.parse_args()

  root_dir = pathlib.Path(args.root).resolve()
  if not root_dir.exists():
    raise SystemExit(f"Root does not exist: {root_dir}")

  httpd = ThreadingHTTPServer((args.host, args.port), SiteHandler)
  httpd.root_dir = root_dir  # type: ignore[attr-defined]

  print(f"Serving {root_dir} at http://{args.host}:{args.port}")
  print("SMS endpoint: POST /api/send-sms")
  httpd.serve_forever()


if __name__ == "__main__":
  main()
