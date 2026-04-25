import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/src/lib/query/keys';

import { createPost, createTopic, listCategories, listPosts, listTopics } from './forumApi';

export function useForumCategories() {
  return useQuery({ queryKey: qk.forumCategories(), queryFn: listCategories });
}

export function useForumTopics(categoryId: string) {
  return useQuery({
    queryKey: qk.forumTopics(categoryId),
    queryFn: async () => (await listTopics(categoryId)).items,
    enabled: Boolean(categoryId),
  });
}

export function useCreateTopic(categoryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { title: string; body: string }) => createTopic(categoryId, args),
    onSuccess: async () => qc.invalidateQueries({ queryKey: qk.forumTopics(categoryId) }),
  });
}

export function useForumPosts(topicId: string) {
  return useQuery({
    queryKey: qk.forumPosts(topicId),
    queryFn: async () => (await listPosts(topicId)).items,
    enabled: Boolean(topicId),
  });
}

export function useCreatePost(topicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { body: string }) => createPost(topicId, args),
    onSuccess: async () => qc.invalidateQueries({ queryKey: qk.forumPosts(topicId) }),
  });
}

