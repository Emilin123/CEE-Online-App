plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }

android { namespace = "online.cee.app"; compileSdk = 35
    defaultConfig { applicationId = "online.cee.app"; minSdk = 26; targetSdk = 35; versionCode = 1; versionName = "0.1.0" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-compose:1.9.2")
    implementation(platform("androidx.compose:compose-bom:2024.09.02"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
}
