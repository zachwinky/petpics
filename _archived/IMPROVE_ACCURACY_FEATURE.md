# Improve Accuracy Feature (Archived)

**Removed**: January 2026
**Reason**: Feature made generations worse - the comprehensive product features conflicted with the LoRA training

## What It Was

An "Improve Accuracy" tab on the subject detail page that allowed users to:
1. Select a generated image as a "reference" - LLaVA would analyze it for shape, colors, materials, text, distinctive features
2. Add manual corrections - User could type feedback like "the cap should be more gold"

These features were stored in `product_features` JSONB column and injected into generation prompts.

## Why It Failed

The LoRA already knows what the product looks like from training. Adding verbose AI-generated descriptions about shape, colors, materials etc. conflicted with what the LoRA learned, producing worse results.

The original text-only feature (`product_description`) works because it only adds visible text (like brand names, labels) which the LoRA struggles with but benefits from hints.

## Files That Were Removed

- `components/ImproveAccuracyTab.tsx`
- `components/ReferenceImageSelector.tsx`
- `components/ProductFeedbackInput.tsx`
- `app/api/set-reference-image/route.ts`
- `app/api/save-product-feedback/route.ts`
- `lib/promptBuilder.ts`

## Database

The `product_features` JSONB column still exists but is no longer used. The working `product_description` column (text-only) remains active.

## If Revisiting This Feature

Key insight: Less is more with LoRA. The model was trained on the product images - it doesn't need comprehensive descriptions of what the product looks like.

Possible approaches that might work better:
1. Only use features when user EXPLICITLY reports a problem (not automatic analysis)
2. Keep feature hints extremely brief (single words, not sentences)
3. Focus only on things LoRA actually struggles with (text rendering, specific color accuracy)
4. Consider negative prompts instead of positive hints

## Related Code

The analyze-product API still exists for the "Analyze Text" button which extracts visible text. This feature works and should be kept.
