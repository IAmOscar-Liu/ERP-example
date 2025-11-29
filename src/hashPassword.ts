import bcrypt from "bcrypt";

const plainPassword = "Test1234@";
const saltRounds = 10; // Recommended cost factor, balance security and performance

async function hashPassword(password: string) {
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log("Hashed Password:", hashedPassword);
    // You would typically store the hashedPassword in your database
    return hashedPassword;
  } catch (error) {
    console.error("Error hashing password:", error);
    throw error;
  }
}

// Call the function
hashPassword(plainPassword);
