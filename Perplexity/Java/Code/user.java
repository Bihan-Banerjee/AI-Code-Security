@Entity
@Table(name = "users")
public class User {
    @Id @GeneratedValue
    private Long id;
    @Column(unique = true, nullable = false)
    private String username;
    private String password;
    private String bio;
    private String phone;
    private String profileImage; // stores file path
    // getters/setters
}
