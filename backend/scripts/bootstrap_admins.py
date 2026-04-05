# backend/scripts/bootstrap_admins.py
from app.db import SessionLocal
from app.models.user import User
from app.security import hash_password

ADMINS = [
    {
        "email": "kyc-admin@dundaa.com",
        "username": "dundaa_kyc_admin",
        "password": "CHANGE_ME_1",
        "role": "admin_kyc",
    },
    {
        "email": "ops-admin@dundaa.com",
        "username": "dundaa_ops_admin",
        "password": "CHANGE_ME_2",
        "role": "admin_ops",
    },
    {
        "email": "super-admin@dundaa.com",
        "username": "dundaa_super_admin",
        "password": "CHANGE_ME_3",
        "role": "super_admin",
    },
]

def run():
    db = SessionLocal()
    try:
        for item in ADMINS:
            existing = db.query(User).filter(User.email == item["email"]).first()
            if existing:
                existing.role = item["role"]
                existing.is_active_admin = True
            else:
                db.add(User(
                    email=item["email"],
                    username=item["username"],
                    hashed_password=hash_password(item["password"]),
                    role=item["role"],
                    is_active_admin=True,
                    account_status="active",
                ))
        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    run()