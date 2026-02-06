import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAdminConfig, setAdminConfig } from '@/lib/db';
import { PRESET_PROMPTS } from '@/lib/presetPrompts';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current sample prompt IDs
    const samplePromptIds = await getAdminConfig<string[]>('sample_prompt_ids') || ['studio-white', 'park-scene'];

    // Return with available presets for UI
    return NextResponse.json({
      samplePromptIds,
      availablePresets: PRESET_PROMPTS.map(p => ({
        id: p.id,
        label: p.label,
        description: p.description,
      })),
    });
  } catch (error) {
    console.error('Error fetching sample config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sample config' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { samplePromptIds } = body;

    // Validate: must be array of exactly 2 valid preset IDs
    if (!Array.isArray(samplePromptIds) || samplePromptIds.length !== 2) {
      return NextResponse.json(
        { error: 'Must select exactly 2 sample prompts' },
        { status: 400 }
      );
    }

    // Validate all IDs exist in presets
    const validIds = PRESET_PROMPTS.map(p => p.id);
    for (const id of samplePromptIds) {
      if (!validIds.includes(id)) {
        return NextResponse.json(
          { error: `Invalid preset ID: ${id}` },
          { status: 400 }
        );
      }
    }

    // Save to database
    await setAdminConfig('sample_prompt_ids', samplePromptIds);

    return NextResponse.json({
      success: true,
      samplePromptIds,
    });
  } catch (error) {
    console.error('Error saving sample config:', error);
    return NextResponse.json(
      { error: 'Failed to save sample config' },
      { status: 500 }
    );
  }
}
