"""Migration script to create the geolocation_accuracy_stats table."""

import sqlite3
import os


def run_migration():
    """Create geolocation_accuracy_stats table if it doesn't exist."""

    instance_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'instance'
    )
    db_path = os.path.join(instance_path, 'pointflex.db')

    if not os.path.exists(db_path):
        print("Base de données introuvable. Assurez-vous que instance/pointflex.db existe.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS geolocation_accuracy_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            context_type TEXT NOT NULL,
            context_id INTEGER,
            user_id INTEGER,
            success_streak INTEGER NOT NULL DEFAULT 0,
            failure_streak INTEGER NOT NULL DEFAULT 0,
            total_samples INTEGER NOT NULL DEFAULT 0,
            average_accuracy REAL NOT NULL DEFAULT 0,
            baseline_accuracy REAL,
            temporary_accuracy REAL,
            temporary_expiration TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_geo_accuracy_context_user UNIQUE (context_type, context_id, user_id)
        )
        """
    )

    cursor.execute(
        """
        CREATE TRIGGER IF NOT EXISTS trg_geo_accuracy_stats_updated
        AFTER UPDATE ON geolocation_accuracy_stats
        BEGIN
            UPDATE geolocation_accuracy_stats
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.id;
        END;
        """
    )

    conn.commit()
    conn.close()

    print("Table geolocation_accuracy_stats vérifiée/créée avec succès.")


if __name__ == '__main__':
    run_migration()
