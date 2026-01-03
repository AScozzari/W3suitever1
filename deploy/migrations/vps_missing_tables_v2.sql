-- ============================================
-- VPS Migration: Missing Tables from Replit v2
-- Fixed: Use "department" instead of "department_enum"
-- ============================================

-- Required ENUMs (create if not exist)
DO $$ BEGIN
  CREATE TYPE feed_post_type AS ENUM ('message', 'announcement', 'poll', 'appreciation');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE poll_visibility_mode AS ENUM ('public', 'anonymous', 'user_defined');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE badge_type AS ENUM ('star_performer', 'team_player', 'innovation', 'customer_hero', 'mentor', 'problem_solver', 'dedication', 'leadership', 'collaboration', 'creativity');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done', 'blocked', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_urgency AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_assignment_role AS ENUM ('assignee', 'reviewer', 'watcher');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_dependency_type AS ENUM ('blocks', 'blocked_by', 'related');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==================== CHAT TABLES ====================

CREATE TABLE IF NOT EXISTS w3suite.chat_pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES w3suite.chat_channels(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES w3suite.chat_messages(id) ON DELETE CASCADE,
  pinned_by VARCHAR NOT NULL REFERENCES w3suite.users(id),
  pinned_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(channel_id, message_id)
);

CREATE INDEX IF NOT EXISTS chat_pinned_channel_idx ON w3suite.chat_pinned_messages(channel_id);

CREATE TABLE IF NOT EXISTS w3suite.chat_saved_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES w3suite.tenants(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES w3suite.users(id),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  shortcut VARCHAR(50),
  is_global BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS chat_saved_replies_user_idx ON w3suite.chat_saved_replies(user_id);
CREATE INDEX IF NOT EXISTS chat_saved_replies_tenant_idx ON w3suite.chat_saved_replies(tenant_id);

-- ==================== FEED POSTS ====================

CREATE TABLE IF NOT EXISTS w3suite.feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES w3suite.tenants(id) ON DELETE CASCADE,
  post_type feed_post_type NOT NULL,
  title VARCHAR(500),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  mentioned_user_ids VARCHAR[] DEFAULT '{}',
  tags VARCHAR[] DEFAULT '{}',
  author_id VARCHAR NOT NULL REFERENCES w3suite.users(id),
  team_id UUID REFERENCES w3suite.teams(id),
  department department,
  is_highlighted BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP,
  badge_type badge_type,
  awardee_user_ids VARCHAR[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  reactions_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS feed_posts_tenant_idx ON w3suite.feed_posts(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS feed_posts_author_idx ON w3suite.feed_posts(author_id);
CREATE INDEX IF NOT EXISTS feed_posts_type_idx ON w3suite.feed_posts(post_type);
CREATE INDEX IF NOT EXISTS feed_posts_team_idx ON w3suite.feed_posts(team_id);
CREATE INDEX IF NOT EXISTS feed_posts_department_idx ON w3suite.feed_posts(department);
CREATE INDEX IF NOT EXISTS feed_posts_pinned_idx ON w3suite.feed_posts(tenant_id, is_pinned);

-- ==================== FEED POST RECIPIENTS ====================

CREATE TABLE IF NOT EXISTS w3suite.feed_post_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES w3suite.feed_posts(id) ON DELETE CASCADE,
  user_id VARCHAR REFERENCES w3suite.users(id),
  team_id UUID REFERENCES w3suite.teams(id),
  department department,
  is_all_users BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS feed_recipients_post_idx ON w3suite.feed_post_recipients(post_id);
CREATE INDEX IF NOT EXISTS feed_recipients_user_idx ON w3suite.feed_post_recipients(user_id);
CREATE INDEX IF NOT EXISTS feed_recipients_team_idx ON w3suite.feed_post_recipients(team_id);

-- ==================== FEED REACTIONS ====================

CREATE TABLE IF NOT EXISTS w3suite.feed_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES w3suite.feed_posts(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES w3suite.users(id),
  reaction_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(post_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS feed_reactions_post_idx ON w3suite.feed_reactions(post_id);
CREATE INDEX IF NOT EXISTS feed_reactions_user_idx ON w3suite.feed_reactions(user_id);

-- ==================== FEED COMMENTS ====================

CREATE TABLE IF NOT EXISTS w3suite.feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES w3suite.feed_posts(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES w3suite.users(id),
  content TEXT NOT NULL,
  mentioned_user_ids VARCHAR[] DEFAULT '{}',
  parent_comment_id UUID,
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS feed_comments_post_idx ON w3suite.feed_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS feed_comments_user_idx ON w3suite.feed_comments(user_id);
CREATE INDEX IF NOT EXISTS feed_comments_parent_idx ON w3suite.feed_comments(parent_comment_id);

-- ==================== FEED READ TRACKING ====================

CREATE TABLE IF NOT EXISTS w3suite.feed_post_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES w3suite.feed_posts(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES w3suite.users(id),
  read_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS feed_reads_post_idx ON w3suite.feed_post_reads(post_id);
CREATE INDEX IF NOT EXISTS feed_reads_user_idx ON w3suite.feed_post_reads(user_id);

-- ==================== FEED USER FAVORITES ====================

CREATE TABLE IF NOT EXISTS w3suite.feed_user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES w3suite.users(id),
  post_id UUID NOT NULL REFERENCES w3suite.feed_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS feed_favorites_user_idx ON w3suite.feed_user_favorites(user_id);

-- ==================== FEED SMART FOLLOW ====================

CREATE TABLE IF NOT EXISTS w3suite.feed_user_unfollows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES w3suite.users(id),
  post_id UUID NOT NULL REFERENCES w3suite.feed_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS feed_unfollows_user_idx ON w3suite.feed_user_unfollows(user_id);

-- ==================== POLL OPTIONS ====================

CREATE TABLE IF NOT EXISTS w3suite.feed_poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES w3suite.feed_posts(id) ON DELETE CASCADE,
  option_text VARCHAR(500) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  vote_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS poll_options_post_idx ON w3suite.feed_poll_options(post_id);

-- ==================== POLL VOTES ====================

CREATE TABLE IF NOT EXISTS w3suite.feed_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES w3suite.feed_posts(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES w3suite.feed_poll_options(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES w3suite.users(id),
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(post_id, user_id, option_id)
);

CREATE INDEX IF NOT EXISTS poll_votes_option_idx ON w3suite.feed_poll_votes(option_id);
CREATE INDEX IF NOT EXISTS poll_votes_user_idx ON w3suite.feed_poll_votes(user_id);

-- ==================== POLL SETTINGS ====================

CREATE TABLE IF NOT EXISTS w3suite.feed_poll_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES w3suite.feed_posts(id) ON DELETE CASCADE UNIQUE,
  visibility_mode poll_visibility_mode DEFAULT 'public' NOT NULL,
  allow_multiple_choices BOOLEAN DEFAULT FALSE,
  allow_vote_change BOOLEAN DEFAULT TRUE,
  is_closed BOOLEAN DEFAULT FALSE,
  closed_at TIMESTAMP,
  closed_by_user_id VARCHAR REFERENCES w3suite.users(id)
);

CREATE INDEX IF NOT EXISTS poll_settings_post_idx ON w3suite.feed_poll_settings(post_id);

-- ==================== TASKS (EISENHOWER MATRIX) ====================

CREATE TABLE IF NOT EXISTS w3suite.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES w3suite.tenants(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status task_status DEFAULT 'todo' NOT NULL,
  priority task_priority DEFAULT 'medium' NOT NULL,
  urgency task_urgency DEFAULT 'medium' NOT NULL,
  creator_id VARCHAR NOT NULL REFERENCES w3suite.users(id),
  department department,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  due_date TIMESTAMP,
  start_date TIMESTAMP,
  completed_at TIMESTAMP,
  archived_at TIMESTAMP,
  estimated_hours REAL,
  actual_hours REAL,
  completion_percentage INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  linked_workflow_instance_id UUID REFERENCES w3suite.workflow_instances(id),
  linked_workflow_team_id UUID REFERENCES w3suite.teams(id),
  triggered_by_workflow_step_id UUID,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule JSONB,
  parent_recurring_task_id UUID,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS tasks_tenant_idx ON w3suite.tasks(tenant_id);
CREATE INDEX IF NOT EXISTS tasks_creator_idx ON w3suite.tasks(tenant_id, creator_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON w3suite.tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS tasks_department_idx ON w3suite.tasks(tenant_id, department);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON w3suite.tasks(tenant_id, due_date);
CREATE INDEX IF NOT EXISTS tasks_workflow_idx ON w3suite.tasks(linked_workflow_instance_id);

-- ==================== TASK ASSIGNMENTS ====================

CREATE TABLE IF NOT EXISTS w3suite.task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES w3suite.tasks(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES w3suite.tenants(id),
  user_id VARCHAR NOT NULL REFERENCES w3suite.users(id),
  role task_assignment_role NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW() NOT NULL,
  assigned_by VARCHAR NOT NULL REFERENCES w3suite.users(id),
  notify_on_update BOOLEAN DEFAULT TRUE,
  notify_on_comment BOOLEAN DEFAULT TRUE,
  UNIQUE(task_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS task_assignments_user_idx ON w3suite.task_assignments(user_id, role);
CREATE INDEX IF NOT EXISTS task_assignments_task_idx ON w3suite.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS task_assignments_tenant_idx ON w3suite.task_assignments(tenant_id);

-- ==================== TASK CHECKLIST ITEMS ====================

CREATE TABLE IF NOT EXISTS w3suite.task_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES w3suite.tasks(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES w3suite.tenants(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  assigned_to_user_id VARCHAR REFERENCES w3suite.users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  completed_by VARCHAR REFERENCES w3suite.users(id),
  is_completed BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS checklist_task_idx ON w3suite.task_checklist_items(task_id, position);
CREATE INDEX IF NOT EXISTS checklist_assigned_idx ON w3suite.task_checklist_items(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS checklist_due_date_idx ON w3suite.task_checklist_items(due_date);

-- ==================== TASK COMMENTS ====================

CREATE TABLE IF NOT EXISTS w3suite.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES w3suite.tasks(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES w3suite.tenants(id),
  user_id VARCHAR NOT NULL REFERENCES w3suite.users(id),
  content TEXT NOT NULL,
  parent_comment_id UUID,
  mentioned_user_ids VARCHAR[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS comments_task_idx ON w3suite.task_comments(task_id, created_at);
CREATE INDEX IF NOT EXISTS comments_user_idx ON w3suite.task_comments(user_id);

-- ==================== TASK TIME LOGS ====================

CREATE TABLE IF NOT EXISTS w3suite.task_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES w3suite.tasks(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES w3suite.tenants(id),
  user_id VARCHAR NOT NULL REFERENCES w3suite.users(id),
  checklist_item_id UUID REFERENCES w3suite.task_checklist_items(id) ON DELETE SET NULL,
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  duration INTEGER,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS time_logs_task_idx ON w3suite.task_time_logs(task_id, user_id);
CREATE INDEX IF NOT EXISTS time_logs_user_idx ON w3suite.task_time_logs(user_id, started_at);
CREATE INDEX IF NOT EXISTS time_logs_running_idx ON w3suite.task_time_logs(user_id, ended_at);

-- ==================== TASK DEPENDENCIES ====================

CREATE TABLE IF NOT EXISTS w3suite.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES w3suite.tenants(id),
  task_id UUID NOT NULL REFERENCES w3suite.tasks(id) ON DELETE CASCADE,
  dependent_task_id UUID NOT NULL REFERENCES w3suite.tasks(id) ON DELETE CASCADE,
  dependency_type task_dependency_type DEFAULT 'blocks' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_by VARCHAR NOT NULL REFERENCES w3suite.users(id),
  UNIQUE(task_id, dependent_task_id)
);

CREATE INDEX IF NOT EXISTS task_dependencies_task_idx ON w3suite.task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS task_dependencies_depends_idx ON w3suite.task_dependencies(dependent_task_id);

-- ==================== TASK ATTACHMENTS ====================

CREATE TABLE IF NOT EXISTS w3suite.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES w3suite.tasks(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES w3suite.tenants(id),
  uploaded_by VARCHAR NOT NULL REFERENCES w3suite.users(id),
  file_name VARCHAR(500) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS attachments_task_idx ON w3suite.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS attachments_user_idx ON w3suite.task_attachments(uploaded_by);

-- ==================== TASK TEMPLATES ====================

CREATE TABLE IF NOT EXISTS w3suite.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES w3suite.tenants(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL DEFAULT '{}',
  created_by VARCHAR NOT NULL REFERENCES w3suite.users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS task_templates_tenant_idx ON w3suite.task_templates(tenant_id);

-- ==================== USER BADGES (GAMIFICATION) ====================

CREATE TABLE IF NOT EXISTS w3suite.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES w3suite.tenants(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES w3suite.users(id),
  badge_type badge_type NOT NULL,
  post_id UUID REFERENCES w3suite.feed_posts(id) ON DELETE SET NULL,
  awarded_by_user_id VARCHAR NOT NULL REFERENCES w3suite.users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS user_badges_user_idx ON w3suite.user_badges(user_id);
CREATE INDEX IF NOT EXISTS user_badges_tenant_idx ON w3suite.user_badges(tenant_id);
CREATE INDEX IF NOT EXISTS user_badges_type_idx ON w3suite.user_badges(badge_type);

-- ==================== USER PRESENCE ====================

CREATE TABLE IF NOT EXISTS w3suite.user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES w3suite.users(id) UNIQUE,
  tenant_id UUID NOT NULL REFERENCES w3suite.tenants(id),
  status VARCHAR(20) DEFAULT 'offline',
  last_seen_at TIMESTAMP DEFAULT NOW(),
  current_page VARCHAR(500),
  is_typing_in_channel UUID,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS user_presence_user_idx ON w3suite.user_presence(user_id);
CREATE INDEX IF NOT EXISTS user_presence_tenant_idx ON w3suite.user_presence(tenant_id);
CREATE INDEX IF NOT EXISTS user_presence_status_idx ON w3suite.user_presence(status);

-- ==================== RLS POLICIES ====================

ALTER TABLE w3suite.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE w3suite.feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE w3suite.feed_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE w3suite.feed_post_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE w3suite.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE w3suite.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE w3suite.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE w3suite.user_badges ENABLE ROW LEVEL SECURITY;

SELECT 'Migration v2 completed successfully!' AS status;
