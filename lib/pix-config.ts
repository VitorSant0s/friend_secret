export type DonationConfig = {
  key: string
  name: string
  city: string
}

export function donationConfig(): DonationConfig {
  return {
    key: process.env.PIX_KEY?.trim() ?? "",
    name: process.env.PIX_NAME?.trim() ?? "",
    city: process.env.PIX_CITY?.trim() ?? "",
  }
}

export function isDonationConfigured(config = donationConfig()): boolean {
  return Boolean(config.key && config.name && config.city)
}
