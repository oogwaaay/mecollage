/**
 * Download video from Cloudinary and convert to MP4 for YouTube upload
 * This provides a direct download link for manual YouTube upload
 */

const CLOUD_NAME = 'dztbpf6ke';
const VIDEO_PUBLIC_ID = 'videos/p4cmp3wmxjmjwq8afidf'; // Latest demo video

// Cloudinary can convert WebM to MP4 on-the-fly
const mp4Url = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/f_mp4/${VIDEO_PUBLIC_ID}.webm`;

console.log('📹 Video ready for YouTube upload!');
console.log('\n📎 Direct MP4 Download URL:');
console.log(mp4Url);
console.log('\n💡 Instructions:');
console.log('1. Copy the URL above');
console.log('2. Open it in your browser to download the MP4 file');
console.log('3. Go to https://www.youtube.com/upload');
console.log('4. Upload the downloaded MP4 file');
console.log('\n✅ This is faster than setting up OAuth!');

