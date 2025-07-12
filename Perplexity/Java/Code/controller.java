@RestController
@RequestMapping("/api/user")
public class UserController {
    @GetMapping("/me")
    public ResponseEntity<UserResponseDto> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        // fetch user by username, map to UserResponseDto
    }
}
