#!/usr/bin/env node
/**
 * PostgreSQL Database Schema Diagnostic Script
 * 
 * This script inspects the current PostgreSQL database schema to understand
 * the structure and identify issues with NextAuth setup.
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('🔍 Connecting to PostgreSQL database...');
    
    // Check if database connection works
    const connectionTest = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Connected successfully at:', connectionTest.rows[0].current_time);
    
    // List all tables
    console.log('\n📋 TABLES IN DATABASE:');
    const tablesResult = await pool.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('   No tables found in public schema');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name} (${row.table_type})`);
      });
    }
    
    // Check users table structure if it exists
    const usersTableExists = tablesResult.rows.some(row => row.table_name === 'users');
    if (usersTableExists) {
      console.log('\n👤 USERS TABLE STRUCTURE:');
      const usersStructure = await pool.query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable, 
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `);
      
      usersStructure.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`   - ${col.column_name}: ${col.data_type}${length} ${nullable}${defaultVal}`);
      });
      
      // Check for constraints on users table
      console.log('\n🔗 USERS TABLE CONSTRAINTS:');
      const usersConstraints = await pool.query(`
        SELECT 
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.table_name = 'users' 
        AND tc.table_schema = 'public'
        ORDER BY tc.constraint_type, tc.constraint_name;
      `);
      
      if (usersConstraints.rows.length === 0) {
        console.log('   No constraints found');
      } else {
        usersConstraints.rows.forEach(constraint => {
          let description = `${constraint.constraint_type} on ${constraint.column_name}`;
          if (constraint.foreign_table_name) {
            description += ` -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`;
          }
          console.log(`   - ${constraint.constraint_name}: ${description}`);
        });
      }
      
      // Count users
      const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
      console.log(`\n📊 USER DATA: ${userCount.rows[0].count} users in database`);
      
      // Show sample user data
      const sampleUsers = await pool.query('SELECT id, email, name, image FROM users LIMIT 5');
      if (sampleUsers.rows.length > 0) {
        console.log('   Sample users:');
        sampleUsers.rows.forEach(user => {
          console.log(`   - ${user.email} (ID: ${user.id})`);
        });
      }
    }
    
    // Check other NextAuth tables
    const nextAuthTables = ['accounts', 'sessions', 'verification_tokens'];
    for (const tableName of nextAuthTables) {
      const tableExists = tablesResult.rows.some(row => row.table_name === tableName);
      if (tableExists) {
        console.log(`\n📋 ${tableName.toUpperCase()} TABLE STRUCTURE:`);
        const tableStructure = await pool.query(`
          SELECT 
            column_name, 
            data_type, 
            is_nullable, 
            column_default
          FROM information_schema.columns 
          WHERE table_name = $1 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `, [tableName]);
        
        tableStructure.rows.forEach(col => {
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
          console.log(`   - ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
        });
        
        // Count records
        const count = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`   📊 Records: ${count.rows[0].count}`);
      } else {
        console.log(`\n❌ ${tableName.toUpperCase()} TABLE: Not found`);
      }
    }
    
    console.log('\n✅ Database diagnostic complete!');
    
  } catch (error) {
    console.error('❌ Error during database diagnostic:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
