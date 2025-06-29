@Entity
public class User {
  @Id @GeneratedValue
  private Long id;
  private String username;
  private String password;
  private String bio;
  private String phone;
  private String profileImage;
}
