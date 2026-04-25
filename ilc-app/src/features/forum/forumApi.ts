import { env } from '@/src/lib/env';
import { requestJson } from '@/src/lib/api/client';
import type { ForumCategory, Post, Topic } from '@/src/types/models';

type Paginated<T> = { items: T[]; nextCursor: string | null };

let mockCategories: ForumCategory[] = [
  { id: 'cat_1', name: 'Ketenagakerjaan', description: 'PHK, kontrak kerja, upah' },
  { id: 'cat_2', name: 'Perdata', description: 'Perjanjian, wanprestasi, ganti rugi' },
];

let mockTopics: Topic[] = [
  { id: 'topic_1', categoryId: 'cat_1', title: 'Bolehkah PHK sepihak?', authorId: 'user_mock', createdAt: new Date().toISOString() },
];

let mockPosts: Post[] = [
  { id: 'post_1', topicId: 'topic_1', authorId: 'user_mock', body: 'Saya dapat surat PHK, apa langkah awal?', createdAt: new Date().toISOString() },
  { id: 'post_2', topicId: 'topic_1', authorId: 'lawyer_demo', body: 'Kumpulkan bukti hubungan kerja dan cek alasan PHK.', createdAt: new Date().toISOString() },
];

export async function listCategories(): Promise<ForumCategory[]> {
  if (env.useMockData) return mockCategories;
  return requestJson<ForumCategory[]>('/v1/forum/categories', { auth: true });
}

export async function listTopics(categoryId: string): Promise<Paginated<Topic>> {
  if (env.useMockData) return { items: mockTopics.filter((t) => t.categoryId === categoryId), nextCursor: null };
  return requestJson<Paginated<Topic>>(`/v1/forum/categories/${categoryId}/topics`, { auth: true });
}

export async function createTopic(categoryId: string, args: { title: string; body: string }): Promise<{ topic: Topic; firstPost: Post }> {
  if (env.useMockData) {
    const topic: Topic = { id: `topic_${Date.now()}`, categoryId, title: args.title, authorId: 'user_mock', createdAt: new Date().toISOString() };
    const firstPost: Post = { id: `post_${Date.now()}`, topicId: topic.id, authorId: 'user_mock', body: args.body, createdAt: new Date().toISOString() };
    mockTopics = [topic, ...mockTopics];
    mockPosts = [firstPost, ...mockPosts];
    return { topic, firstPost };
  }
  return requestJson(`/v1/forum/categories/${categoryId}/topics`, { method: 'POST', auth: true, body: args });
}

export async function listPosts(topicId: string): Promise<Paginated<Post>> {
  if (env.useMockData) return { items: mockPosts.filter((p) => p.topicId === topicId), nextCursor: null };
  return requestJson<Paginated<Post>>(`/v1/forum/topics/${topicId}/posts`, { auth: true });
}

export async function createPost(topicId: string, args: { body: string }): Promise<{ post: Post }> {
  if (env.useMockData) {
    const post: Post = { id: `post_${Date.now()}`, topicId, authorId: 'user_mock', body: args.body, createdAt: new Date().toISOString() };
    mockPosts = [...mockPosts, post];
    return { post };
  }
  return requestJson(`/v1/forum/topics/${topicId}/posts`, { method: 'POST', auth: true, body: args });
}

