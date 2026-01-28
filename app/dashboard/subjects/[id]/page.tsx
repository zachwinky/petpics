import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserById, getModelById, getModelGenerations, getModelVideoGenerations } from '@/lib/db';
import NavbarWrapper from '@/components/NavbarWrapper';
import Link from 'next/link';
import PreviewButton from '@/components/PreviewButton';
import AnalyzeCollarButton from '@/components/AnalyzeCollarButton';
import SubjectDetailContent from '@/components/SubjectDetailContent';

export default async function PhotoSubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const user = await getUserById(parseInt(session.user.id));
  if (!user) {
    redirect('/auth/signin');
  }

  const modelId = parseInt(id);
  const model = await getModelById(modelId, user.id);

  if (!model) {
    redirect('/dashboard');
  }

  const generations = await getModelGenerations(modelId, user.id);
  const videos = await getModelVideoGenerations(modelId, user.id);

  // Transform generations for client component
  const generationsForClient = generations.map(gen => ({
    id: gen.id,
    image_urls: gen.image_urls,
    custom_prompt: gen.custom_prompt || null,
    preset_prompt_id: gen.preset_prompt_id || null,
    row_prompts: gen.row_prompts || [],
    image_quality_scores: gen.image_quality_scores,
    credits_used: gen.credits_used,
    created_at: gen.created_at.toISOString(),
    reroll_used: gen.reroll_used || false,
    upscale_used: gen.upscale_used || false,
    aspect_ratio: gen.aspect_ratio || 'instagram-feed',
  }));

  // Transform videos for client component
  const videosForClient = videos.map(video => ({
    id: video.id,
    modelId: video.model_id,
    sourceImageUrl: video.source_image_url,
    motionPrompt: video.motion_prompt,
    status: video.status,
    videoUrl: video.video_url,
    errorMessage: video.error_message,
    creditsUsed: video.credits_used,
    createdAt: video.created_at.toISOString(),
    completedAt: video.completed_at?.toISOString(),
  }));

  const modelForClient = {
    id: model.id,
    trigger_word: model.trigger_word,
    lora_url: model.lora_url,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <NavbarWrapper />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Back Button */}
          <Link
            href="/dashboard"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>

          {/* Photo Subject Info */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 md:p-8">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">{model.trigger_word}</h1>

              {/* Preview Image */}
              <div className="mb-6 flex flex-col items-center">
                {model.preview_image_url ? (
                  <img
                    src={model.preview_image_url}
                    alt="Preview"
                    className="w-full max-w-sm rounded-xl border border-gray-200 shadow-sm mb-2"
                  />
                ) : (
                  <div className="w-full max-w-sm aspect-square rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center mb-2 bg-gray-50">
                    <p className="text-gray-400 text-sm">No preview generated yet</p>
                  </div>
                )}
                <PreviewButton
                  modelId={model.id}
                  loraUrl={model.lora_url}
                  triggerWord={model.trigger_word}
                  currentPreviewUrl={model.preview_image_url}
                />
                <AnalyzeCollarButton
                  modelId={model.id}
                  previewImageUrl={model.preview_image_url}
                  hasDescription={!!model.product_description}
                />
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-sm text-gray-600 mb-6">
                <div>
                  <span className="font-medium">Training images:</span> {model.training_images_count}
                </div>
                <div>
                  <span className="font-medium">Created:</span>{' '}
                  {new Date(model.created_at).toLocaleDateString()}
                </div>
              </div>

              {/* Notes */}
              {model.notes && (
                <div className="w-full max-w-lg mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-gray-700">{model.notes}</p>
                </div>
              )}

              {/* Action Button */}
              <Link
                href={`/generate?modelId=${model.id}`}
                className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-center"
              >
                Generate More Photos
              </Link>
            </div>
          </div>

          {/* Product Images & Videos */}
          <SubjectDetailContent
            generations={generationsForClient}
            model={modelForClient}
            initialVideos={videosForClient}
          />
        </div>
      </main>
    </div>
  );
}
