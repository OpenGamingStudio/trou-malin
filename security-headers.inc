# CSP identique à la <meta> de index.html, plus les directives réservées aux en-têtes.
# Tailwind est compilé dans un fichier CSS (aucun style inline) ; le canvas n'exige rien de plus ; polices locales.
add_header Content-Security-Policy "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://api.opengamingstudio.com; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "no-referrer" always;
add_header Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
