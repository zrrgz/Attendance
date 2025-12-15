cat > start.sh <<'SH'
#!/bin/sh
# ensure /data exists and DB path
DB_PATH=${DB_PATH:-./attendance.db}
# if running inside Fly container and /data exists, put DB there
mkdir -p "$(dirname "$DB_PATH")"
# if DB missing and init-db exists, run initializer
if [ ! -f "$DB_PATH" ] && [ -f ./init-db.js ]; then
  echo "DB not found at $DB_PATH — seeding..."
  # run init-db but ensure it writes to DB_PATH (init-db.js must honor DB_PATH or we copy after)
  node init-db.js
  # if init-db.js created ./attendance.db but we want DB_PATH elsewhere, move it
  if [ -f ./attendance.db ] && [ "$DB_PATH" != "./attendance.db" ]; then
    mv ./attendance.db "$DB_PATH"
  fi
fi

# start node
node server.js
SH

# make executable
chmod +x start.sh
