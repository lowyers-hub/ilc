import { DataSource } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import { UserEntity } from './src/modules/users/entities/user.entity';

async function run() {
  const ds = new DataSource({
    type: 'postgres',
    url: 'postgresql://postgres:postgres@localhost:5432/ilc',
    entities: [UserEntity],
  });
  await ds.initialize();
  
  // Create user
  let user = await ds.getRepository(UserEntity).findOne({ where: { email: 'test@example.com' } });
  if (!user) {
    user = ds.getRepository(UserEntity).create({ email: 'test@example.com', displayName: 'Test User' });
    await ds.getRepository(UserEntity).save(user);
  }

  // Generate JWT
  const token = jwt.sign({ sub: user.id }, 'dev_secret_change_me', { expiresIn: '15m' });
  console.log('TOKEN:', token);

  // Call API
  const res = await fetch('http://localhost:3000/v1/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ message: "Saya dipecat mendadak tanpa surat" })
  });

  const data = await res.json();
  console.log('AI RESPONSE:', JSON.stringify(data, null, 2));

  await ds.destroy();
}

run().catch(console.error);
