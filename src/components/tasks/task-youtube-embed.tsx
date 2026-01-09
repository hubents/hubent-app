"use client";

interface TaskYoutubeEmbedProps {
  url: string;
}

function getYoutubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

export function TaskYoutubeEmbed({ url }: TaskYoutubeEmbedProps) {
  const videoId = getYoutubeVideoId(url);

  if (!videoId) {
    return (
      <div className="rounded-lg border border-border bg-muted p-4 text-center text-sm text-muted-foreground">
        URL de YouTube no válida
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
