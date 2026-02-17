"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLoginPopup } from "@/components/login-popup"

export default function LoginPage() {
  const router = useRouter()
  const { openLogin } = useLoginPopup()

  useEffect(() => {
    openLogin()
    router.replace("/")
  }, [openLogin, router])

  return null
}


