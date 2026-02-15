/**
 * Department model representing an organizational department.
 */
export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  color: string;
  icon: string;
  is_active: boolean;
  order: number;
  user_count?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Summary representation of a department for nested views.
 */
export interface DepartmentSummary {
  id: string;
  name: string;
  code: string;
  color: string;
  icon: string;
}

/**
 * Payload for creating or updating a department.
 */
export interface DepartmentPayload {
  name: string;
  code: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active?: boolean;
  order?: number;
}

/**
 * Department client folder for organizing documents per department per client.
 */
export interface DepartmentClientFolder {
  id: string;
  name: string;
  department: string;
  department_name?: string;
  department_color?: string;
  contact?: string;
  corporation?: string;
  parent?: string;
  description?: string;
  is_default: boolean;
  document_count: number;
  children_count?: number;
  path?: string;
  created_at: string;
}

/**
 * Folder tree node with nested children.
 */
export interface DepartmentClientFolderTree {
  id: string;
  name: string;
  department: string;
  contact?: string;
  corporation?: string;
  parent?: string;
  is_default: boolean;
  document_count: number;
  children: DepartmentClientFolderTree[];
}

/**
 * Department with its folder tree for a specific client.
 */
export interface DepartmentFolderGroup {
  id: string;
  name: string;
  code: string;
  color: string;
  icon: string;
  folders: DepartmentClientFolderTree[];
}

/**
 * Payload for creating a department client folder.
 */
export interface DepartmentClientFolderCreatePayload {
  name: string;
  department: string;
  contact?: string;
  corporation?: string;
  parent?: string;
  description?: string;
}

/**
 * Payload for updating a department client folder.
 */
export interface DepartmentClientFolderUpdatePayload {
  name?: string;
  description?: string;
  parent?: string;
}

/**
 * Payload for initializing default folders for a client.
 */
export interface InitializeFoldersPayload {
  contact?: string;
  corporation?: string;
  department?: string;
}
