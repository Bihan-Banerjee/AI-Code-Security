@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @PostMapping("/register")
    public ResponseEntity<?> register(@ModelAttribute @Valid UserRegisterDto dto) {
        // handle registration, save file, hash password, save user
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody @Valid UserLoginDto dto) {
        // authenticate, generate JWT, return token
    }
}
