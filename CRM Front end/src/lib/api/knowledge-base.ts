import api from "@/lib/api";
import {
  Category,
  CategoryTree,
  CategoryFormData,
  Article,
  ArticleList,
  ArticleFormData,
  FAQ,
  FAQFormData,
  KBStats,
} from "@/types/knowledge-base";

// Category API
export const categoryApi = {
  list: async (params?: {
    is_active?: boolean;
    is_public?: boolean;
    top_level?: boolean;
  }): Promise<Category[]> => {
    const response = await api.get("/knowledge-base/categories/", { params });
    return response.data.results || response.data;
  },

  tree: async (): Promise<CategoryTree[]> => {
    const response = await api.get("/knowledge-base/categories/tree/");
    return response.data;
  },

  get: async (id: string): Promise<Category> => {
    const response = await api.get(`/knowledge-base/categories/${id}/`);
    return response.data;
  },

  create: async (data: CategoryFormData): Promise<Category> => {
    const response = await api.post("/knowledge-base/categories/", data);
    return response.data;
  },

  update: async (id: string, data: Partial<CategoryFormData>): Promise<Category> => {
    const response = await api.patch(`/knowledge-base/categories/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/knowledge-base/categories/${id}/`);
  },
};

// Article API
export const articleApi = {
  list: async (params?: {
    status?: string;
    category?: string;
    visibility?: string;
    is_featured?: boolean;
    search?: string;
  }): Promise<ArticleList[]> => {
    const response = await api.get("/knowledge-base/articles/", { params });
    return response.data.results || response.data;
  },

  get: async (id: string): Promise<Article> => {
    const response = await api.get(`/knowledge-base/articles/${id}/`);
    return response.data;
  },

  create: async (data: ArticleFormData): Promise<Article> => {
    const response = await api.post("/knowledge-base/articles/", data);
    return response.data;
  },

  update: async (id: string, data: Partial<ArticleFormData>): Promise<Article> => {
    const response = await api.patch(`/knowledge-base/articles/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/knowledge-base/articles/${id}/`);
  },

  publish: async (id: string): Promise<void> => {
    await api.post(`/knowledge-base/articles/${id}/publish/`);
  },

  unpublish: async (id: string): Promise<void> => {
    await api.post(`/knowledge-base/articles/${id}/unpublish/`);
  },

  archive: async (id: string): Promise<void> => {
    await api.post(`/knowledge-base/articles/${id}/archive/`);
  },

  duplicate: async (id: string): Promise<Article> => {
    const response = await api.post(`/knowledge-base/articles/${id}/duplicate/`);
    return response.data;
  },

  uploadAttachment: async (id: string, file: File): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file);
    await api.post(`/knowledge-base/articles/${id}/upload_attachment/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// FAQ API
export const faqApi = {
  list: async (params?: {
    category?: string;
    is_active?: boolean;
    is_public?: boolean;
    search?: string;
  }): Promise<FAQ[]> => {
    const response = await api.get("/knowledge-base/faqs/", { params });
    return response.data.results || response.data;
  },

  get: async (id: string): Promise<FAQ> => {
    const response = await api.get(`/knowledge-base/faqs/${id}/`);
    return response.data;
  },

  create: async (data: FAQFormData): Promise<FAQ> => {
    const response = await api.post("/knowledge-base/faqs/", data);
    return response.data;
  },

  update: async (id: string, data: Partial<FAQFormData>): Promise<FAQ> => {
    const response = await api.patch(`/knowledge-base/faqs/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/knowledge-base/faqs/${id}/`);
  },

  reorder: async (id: string, order: number): Promise<void> => {
    await api.post(`/knowledge-base/faqs/${id}/reorder/`, { order });
  },
};

// Stats API
export const kbStatsApi = {
  get: async (): Promise<KBStats> => {
    const response = await api.get("/knowledge-base/stats/");
    return response.data;
  },
};

// Search API
export const kbSearchApi = {
  search: async (
    query: string
  ): Promise<{ articles: ArticleList[]; faqs: FAQ[] }> => {
    const response = await api.get("/knowledge-base/search/", {
      params: { q: query },
    });
    return response.data;
  },
};
