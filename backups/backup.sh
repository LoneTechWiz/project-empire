#!/bin/bash
# Nightly PostgreSQL backup for the empire database
BACKUP_DIR="/home/devin/dev/project-empire/backups"
FILENAME="empire_$(date +%Y-%m-%d).sql.gz"

PGPASSWORD=empire pg_dump -h 127.0.0.1 -U empire empire | gzip > "$BACKUP_DIR/$FILENAME"

# Keep only the last 14 days of backups
find "$BACKUP_DIR" -name "empire_*.sql.gz" -mtime +14 -delete

echo "$(date): Backup saved to $FILENAME" >> "$BACKUP_DIR/backup.log"
