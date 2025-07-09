"""Service model belonging to a department."""

from datetime import datetime
from backend.database import db


class Service(db.Model):
    """Service within a company department."""

    __tablename__ = "services"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    manager_name = db.Column(db.String(100), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = db.relationship("Company", backref="services", lazy=True)
    department = db.relationship("Department", backref="services", lazy=True)

    def to_dict(self):
        """Return a dictionary representation of the service."""
        return {
            "id": self.id,
            "company_id": self.company_id,
            "department_id": self.department_id,
            "name": self.name,
            "description": self.description,
            "manager_name": self.manager_name,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<Service {self.name}>"
