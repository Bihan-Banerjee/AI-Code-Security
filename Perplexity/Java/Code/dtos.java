public class UserRegisterDto {
    @NotBlank
    private String username;
    @NotBlank
    private String password;
    private String bio;
    private String phone;
    private MultipartFile profileImage;
    // getters/setters
}

public class UserLoginDto {
    @NotBlank
    private String username;
    @NotBlank
    private String password;
    // getters/setters
}

public class UserResponseDto {
    private String username;
    private String bio;
    private String phone;
    private String profileImageUrl;
    // getters/setters
}
