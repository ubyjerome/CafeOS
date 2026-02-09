export const Configs = {
  getAvatar: (seed: string) => {
    return `https://api.dicebear.com/9.x/${import.meta.env.VITE_AVATAR_STYLE || "adventurer"}/svg?seed=${seed || "default"}`;
  },
  cloudinary:{
    cloud_name:import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "demo",
    upload_preset:import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "ml_default"
  },
  instantdb:{
    app_id: import.meta.env.VITE_INSTANTDB_APP_ID || '###'
  },
  paystack:{
    public_key:import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || ''
  },
  theme:{
    avatar_style: import.meta.env.VITE_AVATAR_STYLE || 'adventurer',
    primary_color:import.meta.env.VITE_PRIMARY_COLOR || '#1E4384',
  },
  admin:{
    default_password:import.meta.env.VITE_ADMIN_PASSWORD,
    default_email:import.meta.env.VITE_ADMIN_EMAIL,
    default_logo:"/logo.png"
  }
};
