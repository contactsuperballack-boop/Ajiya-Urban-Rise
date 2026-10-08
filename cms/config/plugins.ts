export default ({ env }: { env: any }) => ({
  upload: {
    config: {
      // Local disk storage is fine for development, but most hosting platforms give Strapi
      // an EPHEMERAL filesystem — the same problem the main app's old JSONL lead store had
      // (see ../server/leadStore.ts's history). Uploaded media (hero images, galleries,
      // team photos) will be lost on every redeploy unless this is swapped for a cloud
      // provider (@strapi/provider-upload-aws-s3, @strapi/provider-upload-cloudinary, etc.)
      // before production traffic — or the seed script — relies on it.
      provider: 'local',
      sizeLimit: 10 * 1024 * 1024, // 10mb
    },
  },
  'users-permissions': {
    config: {
      jwtSecret: env('JWT_SECRET'),
    },
  },
});
