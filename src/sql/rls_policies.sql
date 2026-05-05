-- Central helper: privileged roles
-- Use this in USING/WITH CHECK clauses where appropriate.
-- role IN ('owner','admin')

-- Derive the caller's email once for re-use in policies.
CREATE OR REPLACE FUNCTION public.current_email()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  select coalesce((auth.jwt() ->> 'email')::text, null::text);
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = org_id
      AND (
        om.user_id = auth.uid()
        OR lower(coalesce(om.email, '')) = lower(coalesce(public.current_email(), ''))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = org_id
      AND (
        om.user_id = auth.uid()
        OR lower(coalesce(om.email, '')) = lower(coalesce(public.current_email(), ''))
      )
      AND om.role IN ('owner','admin')
  );
$$;

-- Make this file safe to re-run in Supabase SQL Editor.
DROP POLICY IF EXISTS "org_select_all" ON organizations;
DROP POLICY IF EXISTS "org_select_members" ON organizations;
DROP POLICY IF EXISTS "org_insert_any_authenticated" ON organizations;
DROP POLICY IF EXISTS "org_admins_update_delete" ON organizations;
DROP POLICY IF EXISTS "org_admins_update" ON organizations;
DROP POLICY IF EXISTS "org_admins_delete" ON organizations;

DROP POLICY IF EXISTS "org_read_members" ON organization_members;
DROP POLICY IF EXISTS "org_members_insert_owner_or_admin" ON organization_members;
DROP POLICY IF EXISTS "org_members_update_owner_or_admin" ON organization_members;
DROP POLICY IF EXISTS "org_members_delete_owner_or_admin" ON organization_members;

DROP POLICY IF EXISTS "incidents_insert_members" ON incidents;
DROP POLICY IF EXISTS "incidents_select_all" ON incidents;
DROP POLICY IF EXISTS "incidents_admins_modify" ON incidents;
DROP POLICY IF EXISTS "incidents_admins_update" ON incidents;
DROP POLICY IF EXISTS "incidents_admins_delete" ON incidents;

DROP POLICY IF EXISTS "whistleblower_insert_members" ON whistleblower_reports;
DROP POLICY IF EXISTS "whistleblower_select_all" ON whistleblower_reports;
DROP POLICY IF EXISTS "whistleblower_admins_modify" ON whistleblower_reports;
DROP POLICY IF EXISTS "whistleblower_admins_update" ON whistleblower_reports;
DROP POLICY IF EXISTS "whistleblower_admins_delete" ON whistleblower_reports;

DO $$
BEGIN
  IF to_regclass('public.evidence') IS NOT NULL THEN
    DROP POLICY IF EXISTS "evidence_insert_members" ON evidence;
    DROP POLICY IF EXISTS "evidence_select_all" ON evidence;
    DROP POLICY IF EXISTS "evidence_admins_modify" ON evidence;
    DROP POLICY IF EXISTS "evidence_admins_update" ON evidence;
    DROP POLICY IF EXISTS "evidence_admins_delete" ON evidence;
  END IF;
END $$;

DROP POLICY IF EXISTS "members_can_send_messages" ON org_messages;
DROP POLICY IF EXISTS "org_can_read_messages" ON org_messages;
DROP POLICY IF EXISTS "admins_modify_messages" ON org_messages;
DROP POLICY IF EXISTS "admins_update_messages" ON org_messages;
DROP POLICY IF EXISTS "admins_delete_messages" ON org_messages;

DROP POLICY IF EXISTS "members_clock_self" ON time_entries;
DROP POLICY IF EXISTS "members_view_own_time" ON time_entries;
DROP POLICY IF EXISTS "admins_modify_time" ON time_entries;
DROP POLICY IF EXISTS "admins_update_time" ON time_entries;
DROP POLICY IF EXISTS "admins_delete_time" ON time_entries;

DO $$
BEGIN
  IF to_regclass('public.navigation_entries') IS NOT NULL THEN
    DROP POLICY IF EXISTS "members_use_navigation" ON navigation_entries;
    DROP POLICY IF EXISTS "org_read_navigation" ON navigation_entries;
    DROP POLICY IF EXISTS "admins_modify_navigation" ON navigation_entries;
    DROP POLICY IF EXISTS "admins_update_navigation" ON navigation_entries;
    DROP POLICY IF EXISTS "admins_delete_navigation" ON navigation_entries;
  END IF;

  IF to_regclass('public.dispatch_jobs') IS NOT NULL THEN
    DROP POLICY IF EXISTS "dispatch_read" ON dispatch_jobs;
    DROP POLICY IF EXISTS "dispatch_admins_modify" ON dispatch_jobs;
    DROP POLICY IF EXISTS "dispatch_admins_insert" ON dispatch_jobs;
    DROP POLICY IF EXISTS "dispatch_admins_update" ON dispatch_jobs;
    DROP POLICY IF EXISTS "dispatch_admins_delete" ON dispatch_jobs;
  END IF;

  IF to_regclass('public.job_titles') IS NOT NULL THEN
    DROP POLICY IF EXISTS "job_titles_read" ON job_titles;
    DROP POLICY IF EXISTS "job_titles_admins_modify" ON job_titles;
    DROP POLICY IF EXISTS "job_titles_admins_insert" ON job_titles;
    DROP POLICY IF EXISTS "job_titles_admins_update" ON job_titles;
    DROP POLICY IF EXISTS "job_titles_admins_delete" ON job_titles;
  END IF;

  IF to_regclass('public.job_tasks') IS NOT NULL THEN
    DROP POLICY IF EXISTS "job_tasks_read" ON job_tasks;
    DROP POLICY IF EXISTS "job_tasks_admins_modify" ON job_tasks;
    DROP POLICY IF EXISTS "job_tasks_admins_insert" ON job_tasks;
    DROP POLICY IF EXISTS "job_tasks_admins_update" ON job_tasks;
    DROP POLICY IF EXISTS "job_tasks_admins_delete" ON job_tasks;
  END IF;

  IF to_regclass('public.hazard_zones') IS NOT NULL THEN
    DROP POLICY IF EXISTS "hazards_select" ON hazard_zones;
  END IF;

  IF to_regclass('public.schedule_events') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'schedule_events'
        AND column_name = 'organization_id'
    ) THEN
    DROP POLICY IF EXISTS "schedule_events_select_members" ON schedule_events;
    DROP POLICY IF EXISTS "schedule_events_insert_admins" ON schedule_events;
    DROP POLICY IF EXISTS "schedule_events_update_admins" ON schedule_events;
    DROP POLICY IF EXISTS "schedule_events_delete_admins" ON schedule_events;
  END IF;

  IF to_regclass('public.schedule_assignments') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'schedule_assignments'
        AND column_name = 'event_id'
    )
    AND to_regclass('public.schedule_events') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'schedule_events'
        AND column_name = 'organization_id'
    ) THEN
    DROP POLICY IF EXISTS "schedule_assignments_select_members" ON schedule_assignments;
    DROP POLICY IF EXISTS "schedule_assignments_insert_admins" ON schedule_assignments;
    DROP POLICY IF EXISTS "schedule_assignments_update_admins" ON schedule_assignments;
    DROP POLICY IF EXISTS "schedule_assignments_delete_admins" ON schedule_assignments;
  END IF;
END $$;

-- Organizations: creation must go through create_organization_with_owner(), which
-- validates and redeems a purchased access code. Do not add a direct INSERT policy.
CREATE POLICY "org_select_members"
ON organizations
FOR SELECT
USING (public.is_org_member(id));

CREATE POLICY "org_admins_update"
ON organizations
FOR UPDATE
USING (public.is_org_admin(id))
WITH CHECK (public.is_org_admin(id));

CREATE POLICY "org_admins_delete"
ON organizations
FOR DELETE
USING (public.is_org_admin(id));

-- Organization members:
-- - anyone can read
-- - the first owner row can be inserted during onboarding
-- - after bootstrap, only owners/admins in that org can modify membership
CREATE POLICY "org_read_members"
ON organization_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR lower(coalesce(email, '')) = lower(coalesce(public.current_email(), ''))
  OR public.is_org_member(organization_id)
);

CREATE POLICY "org_members_insert_owner_or_admin"
ON organization_members
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND (
    (
      role = 'owner'
      AND user_id = auth.uid()
      AND lower(coalesce(email, '')) = lower(coalesce(current_email(), ''))
    )
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND (
          om.user_id = auth.uid()
          OR lower(coalesce(om.email, '')) = lower(coalesce(current_email(), ''))
        )
        AND om.role IN ('owner','admin')
    )
  )
);

CREATE POLICY "org_members_update_owner_or_admin"
ON organization_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND (
        om.user_id = auth.uid()
        OR lower(coalesce(om.email, '')) = lower(coalesce(current_email(), ''))
      )
      AND om.role IN ('owner','admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND (
        om.user_id = auth.uid()
        OR lower(coalesce(om.email, '')) = lower(coalesce(current_email(), ''))
      )
      AND om.role IN ('owner','admin')
  )
);

CREATE POLICY "org_members_delete_owner_or_admin"
ON organization_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND (
        om.user_id = auth.uid()
        OR lower(coalesce(om.email, '')) = lower(coalesce(current_email(), ''))
      )
      AND om.role IN ('owner','admin')
  )
);

-- Forms: members can create; only admins/owners can update/delete; everyone can read.
CREATE POLICY "incidents_insert_members"
ON incidents
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND user_id = auth.uid()
  AND (organization_id IS NULL OR public.is_org_member(organization_id))
);

CREATE POLICY "incidents_select_all"
ON incidents
FOR SELECT
USING (true);

CREATE POLICY "incidents_admins_update"
ON incidents
FOR UPDATE
USING (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
WITH CHECK (organization_id IS NOT NULL AND public.is_org_admin(organization_id));

CREATE POLICY "incidents_admins_delete"
ON incidents
FOR DELETE
USING (organization_id IS NOT NULL AND public.is_org_admin(organization_id));

CREATE POLICY "whistleblower_insert_members"
ON whistleblower_reports
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "whistleblower_select_all"
ON whistleblower_reports
FOR SELECT
USING (true);

CREATE POLICY "whistleblower_admins_update"
ON whistleblower_reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.email = current_email()
      AND om.role IN ('owner','admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.email = current_email()
      AND om.role IN ('owner','admin')
  )
);

CREATE POLICY "whistleblower_admins_delete"
ON whistleblower_reports
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.email = current_email()
      AND om.role IN ('owner','admin')
  )
);

DO $$
BEGIN
  IF to_regclass('public.evidence') IS NOT NULL THEN
    EXECUTE $policy$
      CREATE POLICY "evidence_insert_members"
      ON evidence
      FOR INSERT
      WITH CHECK (auth.role() = 'authenticated')
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "evidence_select_all"
      ON evidence
      FOR SELECT
      USING (true)
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "evidence_admins_update"
      ON evidence
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.email = current_email()
            AND om.role IN ('owner','admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.email = current_email()
            AND om.role IN ('owner','admin')
        )
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "evidence_admins_delete"
      ON evidence
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.email = current_email()
            AND om.role IN ('owner','admin')
        )
      )
    $policy$;
  END IF;
END $$;

-- Messaging: members can post; only admins/owners can modify; all can read.
CREATE POLICY "members_can_send_messages"
ON org_messages
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND sender_id = auth.uid()
  AND (organization_id IS NULL OR public.is_org_member(organization_id))
);

CREATE POLICY "org_can_read_messages"
ON org_messages
FOR SELECT
USING (true);

CREATE POLICY "admins_update_messages"
ON org_messages
FOR UPDATE
USING (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
WITH CHECK (organization_id IS NOT NULL AND public.is_org_admin(organization_id));

CREATE POLICY "admins_delete_messages"
ON org_messages
FOR DELETE
USING (organization_id IS NOT NULL AND public.is_org_admin(organization_id));

-- Time entries: users can insert/select their own; only admins/owners can update/delete.
CREATE POLICY "members_clock_self"
ON time_entries
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "members_view_own_time"
ON time_entries
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "admins_update_time"
ON time_entries
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.email = current_email()
      AND om.role IN ('owner','admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.email = current_email()
      AND om.role IN ('owner','admin')
  )
);

CREATE POLICY "admins_delete_time"
ON time_entries
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.email = current_email()
      AND om.role IN ('owner','admin')
  )
);

-- Navigation inputs: allow inserts/read for members; only admins/owners can modify.
DO $$
BEGIN
  IF to_regclass('public.navigation_entries') IS NOT NULL THEN
    EXECUTE $policy$
      CREATE POLICY "members_use_navigation"
      ON navigation_entries
      FOR INSERT
      WITH CHECK (auth.role() = 'authenticated')
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "org_read_navigation"
      ON navigation_entries
      FOR SELECT
      USING (true)
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "admins_update_navigation"
      ON navigation_entries
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.email = current_email()
            AND om.role IN ('owner','admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.email = current_email()
            AND om.role IN ('owner','admin')
        )
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "admins_delete_navigation"
      ON navigation_entries
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.email = current_email()
            AND om.role IN ('owner','admin')
        )
      )
    $policy$;
  END IF;
END $$;

-- Dispatch jobs, schedule config, and other master data: admin-only modifications.
DO $$
BEGIN
  IF to_regclass('public.dispatch_jobs') IS NOT NULL THEN
    EXECUTE $policy$
      CREATE POLICY "dispatch_read"
      ON dispatch_jobs
      FOR SELECT
      USING (true)
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "dispatch_admins_insert"
      ON dispatch_jobs
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.email = current_email()
            AND om.role IN ('owner','admin')
        )
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "dispatch_admins_update"
      ON dispatch_jobs
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.email = current_email()
            AND om.role IN ('owner','admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.email = current_email()
            AND om.role IN ('owner','admin')
        )
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "dispatch_admins_delete"
      ON dispatch_jobs
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.email = current_email()
            AND om.role IN ('owner','admin')
        )
      )
    $policy$;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.job_titles') IS NOT NULL THEN
    EXECUTE $policy$
      CREATE POLICY "job_titles_read"
      ON job_titles
      FOR SELECT
      USING (true)
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "job_titles_admins_insert"
      ON job_titles
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.email = current_email()
            AND om.role IN ('owner','admin')
        )
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "job_titles_admins_update"
      ON job_titles
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.email = current_email()
            AND om.role IN ('owner','admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.email = current_email()
            AND om.role IN ('owner','admin')
        )
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "job_titles_admins_delete"
      ON job_titles
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.email = current_email()
            AND om.role IN ('owner','admin')
        )
      )
    $policy$;
  END IF;

  IF to_regclass('public.job_tasks') IS NOT NULL THEN
    EXECUTE $policy$
      CREATE POLICY "job_tasks_read"
      ON job_tasks
      FOR SELECT
      USING (true)
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "job_tasks_admins_insert"
      ON job_tasks
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.email = current_email()
            AND om.role IN ('owner','admin')
        )
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "job_tasks_admins_update"
      ON job_tasks
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.email = current_email()
            AND om.role IN ('owner','admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.email = current_email()
            AND om.role IN ('owner','admin')
        )
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "job_tasks_admins_delete"
      ON job_tasks
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.email = current_email()
            AND om.role IN ('owner','admin')
        )
      )
    $policy$;
  END IF;
END $$;

-- Hazard/map data (read-only to members by default).
DO $$
BEGIN
  IF to_regclass('public.hazard_zones') IS NOT NULL THEN
    EXECUTE $policy$
      CREATE POLICY "hazards_select"
      ON hazard_zones
      FOR SELECT
      USING (true)
    $policy$;
  END IF;
END $$;

-- Scheduling: members can read their organization's schedule; owners/admins edit.
DO $$
BEGIN
  IF to_regclass('public.schedule_events') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'schedule_events'
        AND column_name = 'organization_id'
    ) THEN
    EXECUTE $policy$
      CREATE POLICY "schedule_events_select_members"
      ON schedule_events
      FOR SELECT
      USING (public.is_org_member(organization_id))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "schedule_events_insert_admins"
      ON schedule_events
      FOR INSERT
      WITH CHECK (public.is_org_admin(organization_id))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "schedule_events_update_admins"
      ON schedule_events
      FOR UPDATE
      USING (public.is_org_admin(organization_id))
      WITH CHECK (public.is_org_admin(organization_id))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "schedule_events_delete_admins"
      ON schedule_events
      FOR DELETE
      USING (public.is_org_admin(organization_id))
    $policy$;
  END IF;

  IF to_regclass('public.schedule_assignments') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'schedule_assignments'
        AND column_name = 'event_id'
    )
    AND to_regclass('public.schedule_events') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'schedule_events'
        AND column_name = 'organization_id'
    ) THEN
    EXECUTE $policy$
      CREATE POLICY "schedule_assignments_select_members"
      ON schedule_assignments
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM schedule_events se
          WHERE se.id = schedule_assignments.event_id
            AND public.is_org_member(se.organization_id)
        )
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "schedule_assignments_insert_admins"
      ON schedule_assignments
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM schedule_events se
          WHERE se.id = schedule_assignments.event_id
            AND public.is_org_admin(se.organization_id)
        )
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "schedule_assignments_update_admins"
      ON schedule_assignments
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM schedule_events se
          WHERE se.id = schedule_assignments.event_id
            AND public.is_org_admin(se.organization_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM schedule_events se
          WHERE se.id = schedule_assignments.event_id
            AND public.is_org_admin(se.organization_id)
        )
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "schedule_assignments_delete_admins"
      ON schedule_assignments
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1
          FROM schedule_events se
          WHERE se.id = schedule_assignments.event_id
            AND public.is_org_admin(se.organization_id)
        )
      )
    $policy$;
  END IF;
END $$;
