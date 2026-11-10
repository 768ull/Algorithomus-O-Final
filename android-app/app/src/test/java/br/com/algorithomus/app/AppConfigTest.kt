package br.com.algorithomus.app

import org.junit.Assert.assertEquals
import org.junit.Test

class AppConfigTest {
    @Test
    fun officialSiteAddressIsHttps() {
        assertEquals("https://algorithomus.com.br/", BuildConfig.OFFICIAL_SITE_URL)
    }

    @Test
    fun offlineShellUsesLocalAssetLoaderDomain() {
        assertEquals(
            "https://appassets.androidplatform.net/assets/offline/index.html",
            BuildConfig.OFFLINE_ASSET_URL
        )
    }
}
