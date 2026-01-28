<!-- Test comment added via AI assistant -->
<!-- Test comment added to the top of this file -->

# Akoolai Generator - Feature Roadmap & TODO

## Infrastructure & Cost Optimization

### Image Storage Migration
- [ ] Implement Cloudflare R2 for image storage
  - Download generated images from FAL API
  - Upload to Cloudflare R2 bucket
  - Store R2 URLs in database instead of FAL URLs
  - Ensure users own their generated images long-term
  - **Cost estimate**: ~$6-10/month for first 1,000 users

## User Experience & Onboarding

### 1. Better Tutorial/Onboarding
- [ ] Create animated tutorial similar to TURO
  - Show users how to take good product photos
  - Demonstrate proper lighting, angles, backgrounds
  - Best practices for training high-quality models
  - Interactive walkthrough on first visit
- [ ] Add tooltip/helper text throughout the upload flow
- [ ] Create example gallery showing before/after results

### 2. Mobile Camera Experience (TURO-style) ✅ COMPLETED
- ✅ Improve mobile photo capture workflow
  - Multi-photo capture without exiting camera
  - Batch photo selection after capture session
  - Native camera integration using MediaDevices API
- ✅ Add photo guidelines overlay during capture
  - Rule of thirds grid lines
  - Center focus area guide
  - Photo tips at bottom of screen

### 3. HEIC Format Support ✅ COMPLETED
- ✅ Add HEIC to supported upload formats
  - Client-side conversion using heic2any library
  - Maintains image quality (0.9 JPEG quality)
  - iPhone photos now upload seamlessly
  - Dynamic import to avoid SSR issues

## Generation Workflow Improvements

### 4. Batch Generation with Background Selection ✅ COMPLETED
- ✅ Generate free backgroundless preview after model training
  - Allow regeneration and deletion of preview
  - Delete preview button with trash icon when preview exists
  - Preview displays on model detail page
- ✅ Create preset background library
  - Multi-scene selection (Beach, Mountains, Urban, Studio, etc.)
  - Custom prompt option available
  - Users can select multiple scenes for variety
- ✅ Implement batch generation API
  - Multiple FAL API calls in parallel
  - Generate 4, 12, or 20 images at once
  - Loading spinner with progress indicator
  - All images delivered together when complete
  - Smart distribution across selected scenes

### 5. AI-Powered Prompt Enhancement
- [ ] Integrate lightweight LLM for image analysis
  - Analyze uploaded training images
  - Generate optimized prompts automatically
  - Describe product characteristics (color, material, style)
  - Eliminate user error in prompt writing
- [ ] Run behind the scenes during training
- [ ] Option to show/edit AI-generated prompt

### 6. Image Editing Capabilities
- [ ] Research image editing integrations
  - Background removal/replacement
  - Color adjustments
  - Crop/resize functionality
  - Filter application
- [ ] Evaluate third-party APIs (Remove.bg, Cloudinary, etc.)
- [ ] Consider building custom editor UI

### 7. Multiple Subjects in One Generation
- [ ] Explore multi-subject LoRA support
  - Train multiple products together
  - Generate scenes with multiple products
  - Product combinations/bundle shots
- [ ] Research FAL API capabilities for this
- [ ] Design UI for selecting multiple subjects

### 8. Instagram-Ready Aspect Ratios ✅ COMPLETED
- ✅ Add aspect ratio selection to generation interface
  - Square (1:1) - Classic Instagram posts
  - Portrait (4:5) - Instagram feed optimized
  - Vertical (9:16) - Instagram Stories/Reels
  - Landscape (16:9) - Horizontal posts
- ✅ Platform-specific presets
  - Instagram Feed, Instagram Story, TikTok
  - Facebook Post, Pinterest, YouTube Thumbnail
  - Twitter/X Post
- ✅ Update FAL API calls to support custom dimensions
- ✅ Aspect ratio stored in database for reroll support

## Dashboard & Navigation Improvements

### 9. Reorganize Product Images Under Photo Subjects ✅ COMPLETED
- ✅ Nest product images under their parent photo subject
  - Remove separate "Recent Product Images" section
  - Show generations when photo subject card is clicked
- ✅ Make photo subject cards clickable
  - Click to view all generated images for that subject
  - Gallery view with download options
  - Delete individual images
- ✅ Update database queries to fetch generations by model_id
- ✅ **Run SQL migration to link existing generations to models**
  - Successfully linked 5 existing generations to their models
  - All product images now appear under their photo subjects

### 10. Video Generation ✅ COMPLETED
- ✅ Integrated Kling AI video generation via FAL API
  - "Animate" button on each generated image
  - Motion prompt input for custom animations
  - 5-second product videos
  - 3 credits per video generation
- ✅ Video gallery with tabs (Images | Videos)
  - Auto-refresh when switching to Videos tab
  - Video playback with controls
  - Download video functionality
  - Processing status indicators (pending, processing, completed, failed)
- ✅ Webhook integration for async video completion
  - Background processing for long video generations
  - Auto-updates when video is ready

### 11. Image Quality Auto-Filtering ✅ COMPLETED
- ✅ CLIP Score integration for quality assessment
  - FAL API CLIP scoring (FREE)
  - Scores each generated image against the prompt
  - Threshold-based filtering (0.22)
- ✅ Blur/reveal UI for low-quality images
  - Low-match images are blurred by default
  - "Reveal" button to show hidden images
  - "Low match" badge on revealed low-quality images
- ✅ Quality scores stored in database per generation

### 12. Row-Level Actions ✅ COMPLETED
- ✅ Remake row feature
  - Free remake once per batch (4 images)
  - Uses same prompt as original row
  - Replaces images in place
- ✅ Upscale HD feature
  - Free upscale once per batch
  - 2x AI upscaling via FAL Clarity Upscaler
  - Subsequent upscales cost 1 credit
  - Cannot remake after upscaling
- ✅ Generate More from row
  - Creates new batch using same prompt
  - 4, 12, or 20 image options
- ✅ Mobile-optimized icon-only buttons
  - Compact circular buttons for mobile
  - Full text buttons on desktop

### 13. Auto-Preview Generation ✅ COMPLETED
- ✅ Automatic preview generation after model training
  - Generates preview image when training completes
  - No credits charged for auto-preview
  - Shows on model detail page
- ✅ Training flow improvements
  - Shows popup confirmation when training starts
  - Redirects to dashboard after starting training
  - No more waiting on training page

## Future Exploration

### Infrastructure Improvements
- [ ] Cloudflare R2 for image storage
  - Download from FAL, upload to R2
  - Long-term image ownership for users

---

## Completed Features
- ✅ De-AI dashboard terminology (Models → Photo Subjects, Generations → Product Images)
- ✅ Authentication bounce fix (JWT callback optimization)
- ✅ Model notes and delete functionality
- ✅ Next.js 16 compatibility
- ✅ Global placeholder text and cursor styling
- ✅ Email verification system
- ✅ Mobile responsive design
- ✅ Stripe credit purchase integration
- ✅ FLUX model training and generation
- ✅ Reorganize product images under photo subjects (#9)
  - Clickable model cards linking to detail pages
  - Generation counts on dashboard
  - Trigger word display instead of auto-generated names
  - API fix to link new generations to models
- ✅ Batch generation with multi-scene selection (#4)
  - Free preview generation with delete functionality
  - 4, 12, or 20 image batch options with credit pricing
  - Multi-scene preset library with 10+ backgrounds
  - Loading spinner during generation
  - Download buttons for all generated images
  - Smart scene distribution algorithm
- ✅ HEIC format support (#3)
  - Client-side heic2any conversion
  - Seamless iPhone photo uploads
- ✅ Mobile camera experience (#2)
  - CameraCapture component with multi-photo capture
  - Rule of thirds grid and focus guides
  - Front/back camera switching
- ✅ Video generation (#10)
  - Kling AI integration via FAL API
  - Animate button on images, motion prompt input
  - Video gallery with status tracking
  - Webhook for async completion
- ✅ Image quality auto-filtering (#11)
  - CLIP score integration (FREE via FAL)
  - Blur/reveal UI for low-match images
  - Quality scores stored per generation
- ✅ Row-level actions (#12)
  - Free remake once per batch
  - Free HD upscale once per batch (cannot remake after)
  - Generate more from same prompt
  - Mobile icon-only compact buttons
- ✅ Auto-preview generation (#13)
  - Automatic preview after training completes
  - Manual preview generation button (always visible)
  - Training popup and dashboard redirect
- ✅ Mobile dashboard improvements
  - Row actions work on all rows (not just first)
  - Hidden download button (long-press to save)
  - Full-width Animate button on mobile
- ✅ UI cleanup
  - Removed HD upscale toggle from generate page
  - Removed "(Free)" text from buttons
- ✅ Instagram-ready aspect ratios (#8)
  - Platform presets (Instagram Feed, Story, TikTok, etc.)
  - Aspect ratio selector with visual previews
  - Stored in database for reroll support
- ✅ Training status visibility
  - Pending trainings table tracks in-progress training
  - Dashboard shows "Training in progress" status
  - Email notification when training completes
  - Automatic preview generation after training

---

## Priority Order (Suggested)

**High Priority (Next 2-4 weeks)**
1. Better tutorial/onboarding (#1)
2. AI-powered prompt enhancement (#5)

**Medium Priority (1-2 months)**
3. Cloudflare R2 image storage migration
4. Image editing capabilities (#6)

**Long-term Exploration (3+ months)**
5. Multiple subjects in one generation (#7)

---

**Last Updated**: 2026-01-26