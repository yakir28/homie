#!/usr/bin/env bash
# Uploads the landing-page slider media for the newest templates to the R2 bucket that
# /api/media/template serves from. Media only: does not touch the template catalog.
# Needs wrangler logged in to the Homie Cloudflare account (npx wrangler login).
# Usage: scripts/upload-template-previews.sh
set -euo pipefail
cd "$(dirname "$0")/.."
BUCKET="${R2_BUCKET_NAME:-homie}"
put() { npx wrangler r2 object put "$BUCKET/$2" --file "$1" --content-type "$3" --cache-control "public, max-age=31536000, immutable" --remote; }
put "prompt ten lights on/preview-web.mp4"          templates/lights-on/preview-v1.mp4        video/mp4
put "prompt ten lights on/thumbnail-web.jpg"        templates/lights-on/thumbnail-v1.jpg      image/jpeg
put "prompt eleven grand entrance/preview-web.mp4"  templates/grand-entrance/preview-v1.mp4   video/mp4
put "prompt eleven grand entrance/thumbnail-web.jpg" templates/grand-entrance/thumbnail-v1.jpg image/jpeg
echo "Uploaded. Check: /api/media/template?key=templates/lights-on/preview-v1.mp4"
