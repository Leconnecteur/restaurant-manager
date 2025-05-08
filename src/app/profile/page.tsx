"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
// import { motion } from "framer-motion"; // Non utilisé

export default function ProfilePage() {
  const { userProfile, updateUserProfile } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || "");
  // Utilisation directe de photoURL du profil utilisateur
  const photoURL = userProfile?.photoURL || "";
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <span>Chargement du profil...</span>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      await updateUserProfile({ displayName, photoURL });
      setSuccess(true);
    } catch (_err: unknown) {
      setError("Erreur lors de la mise à jour du profil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white/70 rounded-2xl shadow-xl p-8 mt-8">
      <h2 className="text-2xl font-bold mb-6 text-center">Mon profil</h2>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="relative w-24 h-24 rounded-full border-4 border-[#EAD9C6] shadow overflow-hidden">
              <Image
                src={photoURL || "/avatar-default.svg"}
                alt="Avatar"
                fill
                style={{ objectFit: 'cover' }}
                className="rounded-full"
                unoptimized={photoURL?.startsWith('data:')}
              />
            </div>
            {/* Ajout d'un input file si tu veux gérer l'upload plus tard */}
          </div>
          <input
            type="text"
            className="border rounded-lg px-4 py-2 text-center focus:outline-none focus:ring-2 focus:ring-[#EAD9C6] bg-[#F6F1EB] text-gray-900"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Nom affiché"
            maxLength={32}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={userProfile.email || ""}
              disabled
              className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
            <input
              type="text"
              value={userProfile.role}
              disabled
              className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant</label>
          <input
            type="text"
            value={userProfile.restaurantId ? `Restaurant ${userProfile.restaurantId}` : "Non défini"}
            disabled
            className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
          />
        </div>
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#EAD9C6] to-[#F6F1EB] text-gray-900 font-semibold shadow transition-all hover:scale-105 hover:shadow-lg hover:shadow-[#EAD9C6]/30 focus:ring-2 focus:ring-[#EAD9C6] active:scale-95"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
        {success && <div className="text-green-600 text-center">Profil mis à jour !</div>}
        {error && <div className="text-red-600 text-center">{error}</div>}
      </form>
    </div>
  );
}
