export const Configs = {
  getAvatar: (seed: string) => {
    return `https://api.dicebear.com/9.x/${import.meta.env.VITE_AVATAR_STYLE || "adventurer"}/svg?seed=${seed || "default"}`;
  },
  cloudinary:{
    cloud_name:import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "demo",
    upload_preset:import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "ml_default"
  },
  instantdb:{
    app_id: import.meta.env.VITE_INSTANTDB_APP_ID || 'b22f1eb5-80d2-4820-b0cb-7743316d365a'
  },
  paystack:{
    public_key:import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || ''
  },
  theme:{
    avatar_style: import.meta.env.VITE_AVATAR_STYLE || 'adventurer',
    primary_color:import.meta.env.VITE_PRIMARY_COLOR || '#1E4384',
  }
};
