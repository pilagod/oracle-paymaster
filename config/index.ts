export const BUNDLER_URL = mustGetEnv("BUNDLER_URL")

function mustGetEnv(name: string) {
    const value = process.env[name]
    if (!value) {
        throw new Error(`Cannot find env variable: ${name}`)
    }
    return value
}
