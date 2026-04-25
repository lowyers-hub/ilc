import { useMutation } from '@tanstack/react-query';

import { transcribeAudio } from './voiceApi';

export function useTranscription() {
  const mutation = useMutation({
    mutationFn: transcribeAudio,
  });

  return {
    transcribe: mutation.mutateAsync,
    status: mutation.status,
    isUploading: mutation.isPending,
    error: mutation.error as Error | null,
    data: mutation.data,
    reset: mutation.reset,
  };
}

