// In your Base44 schema or backend rules

// TimeEntry entity - Row Level Security
{
  "read": "auth.user.email == record.created_by OR auth.user.role == 'admin'",
  "create": "auth.user.email == record.created_by",
  "update": "auth.user.email == record.created_by OR auth.user.role == 'admin'",
  "delete": "auth.user.role == 'admin'"
}

// JobSite entity
{
  "read": "true", // Everyone can read
  "create": "auth.user.role == 'admin'",
  "update": "auth.user.role == 'admin'",
  "delete": "auth.user.role == 'admin'"
}