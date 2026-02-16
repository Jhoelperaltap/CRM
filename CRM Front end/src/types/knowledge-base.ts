export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  parent: string | null;
  order: number;
  is_active: boolean;
  is_public: boolean;
  article_count: number;
  full_path: string;
  children_count: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryTree extends Omit<Category, "children_count"> {
  children: CategoryTree[];
}

export interface ArticleAttachment {
  id: string;
  file: string;
  name: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  created_at: string;
}

export interface ArticleList {
  id: string;
  title: string;
  slug: string;
  summary: string;
  category: string | null;
  category_name: string | null;
  status: "draft" | "published" | "archived";
  visibility: "public" | "internal" | "portal";
  author: string | null;
  author_name: string | null;
  view_count: number;
  helpfulness_score: number | null;
  is_featured: boolean;
  is_pinned: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Article extends ArticleList {
  content: string;
  last_edited_by: string | null;
  last_edited_by_name: string | null;
  tags: string[];
  keywords: string;
  helpful_count: number;
  not_helpful_count: number;
  allow_comments: boolean;
  expires_at: string | null;
  related_articles: string[];
  related_article_ids: string[];
  attachments: ArticleAttachment[];
}

export interface ArticleFeedback {
  id: string;
  article: string;
  feedback_type: "helpful" | "not_helpful";
  comment: string;
  email: string;
  created_at: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  category_name: string | null;
  order: number;
  is_active: boolean;
  is_public: boolean;
  view_count: number;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface KBStats {
  total_articles: number;
  published_articles: number;
  draft_articles: number;
  total_categories: number;
  total_faqs: number;
  total_views: number;
  avg_helpfulness: number | null;
  popular_articles: ArticleList[];
}

export interface ArticleFormData {
  title: string;
  summary?: string;
  content: string;
  category?: string | null;
  status?: "draft" | "published" | "archived";
  visibility?: "public" | "internal" | "portal";
  tags?: string[];
  keywords?: string;
  is_featured?: boolean;
  is_pinned?: boolean;
  allow_comments?: boolean;
  expires_at?: string | null;
  related_article_ids?: string[];
}

export interface CategoryFormData {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  parent?: string | null;
  order?: number;
  is_active?: boolean;
  is_public?: boolean;
}

export interface FAQFormData {
  question: string;
  answer: string;
  category?: string | null;
  order?: number;
  is_active?: boolean;
  is_public?: boolean;
}
