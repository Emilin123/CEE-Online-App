package online.cee.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

private val Navy = Color(0xFF071A33)
private val Gold = Color(0xFFC9A227)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); setContent { CeeOnlineApp() } }
}

@Composable fun CeeOnlineApp() {
    var code by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("Introduce el código de acceso recibido") }
    var privateTaps by remember { mutableIntStateOf(0) }
    MaterialTheme { Surface(color = Navy, modifier = Modifier.fillMaxSize()) {
        Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text("CEE Online", color = Gold, style = MaterialTheme.typography.headlineLarge)
            Text("Conexión CEE Online", color = Color.White)
            OutlinedTextField(value = code, onValueChange = { code = it }, label = { Text("Código de acceso") })
            Button(onClick = { message = if (code.isBlank()) "Escribe un código válido" else "Conectando…" }) { Text("Activar acceso") }
            Text(message, color = Color.White)
            Spacer(Modifier.weight(1f))
            TextButton(onClick = { privateTaps++; if (privateTaps >= 5) message = "Acceso privado disponible" }) { Text("Acceso privado", color = Gold) }
        }
    } }
}
